const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const db = require("./firebase");
const admin = require("firebase-admin");

const PORT = process.env.PORT ||  8000;

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

let connectedUsers = [];
let rooms = [];
let previousRoomIDs = new Set();

// Function to generate a 9-character alphanumeric room ID
const generateRoomID = () => {
    return Math.random().toString(36).substring(2, 11).toUpperCase();
};

const generateUniqueRoomID = () => {
    let roomID;
    do {
        roomID = generateRoomID();
    } while (rooms.find(room => room.roomID === roomID) || previousRoomIDs.has(roomID));
    previousRoomIDs.add(roomID);
    return roomID;
};



// API Routes
app.get('/api/rooms-exists/:roomID', (req, res) => {
    const roomID = req.params.roomID;
    const room = rooms.find(room => room.roomID === roomID);
    if (room) {
        if (room.participants.length > 3) {
            return res.status(200).json({ roomExists: true, full: true });
        } else {
            return res.status(200).json({ roomExists: true, full: false });
        }
    } else {
        return res.status(200).json({ roomExists: false });
    }
});

app.get('/api/participants', (req, res) => {
    const participants = connectedUsers.map(user => ({
        socketID: user.socketID,
        identity: user.identity
    }));
    res.status(200).json({ participants });
});



// Socket.IO setup
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`A user connected ${socket.id}`);

    socket.on('create-new-room', (data) => {
        const roomID = generateUniqueRoomID();
        socket.join(roomID);
        console.log(`Room created with ID: ${roomID}`);
        rooms.push({ roomID, participants: [{ socketID: socket.id, identity: data.identity }], host: socket.id });
        connectedUsers.push({ socketID: socket.id, roomID, identity: data.identity });
        console.log('Connected Users:', connectedUsers);
        socket.emit('room-created', { roomID });
        io.to(roomID).emit('update-participants', rooms.find(room => room.roomID === roomID).participants);
    });



    // Handle WebRTC signaling
    socket.on('offer', (data) => {
        const { target, offer } = data;
        socket.to(target).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', (data) => {
        const { target, answer } = data;
        socket.to(target).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', (data) => {
        const { target, candidate } = data;
        socket.to(target).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('join-room', (data) => {
        const room = rooms.find(room => room.roomID === data.roomId);
        if (room) {
            const existingUser = room.participants.find(participant => participant.identity === data.identity);
            if (existingUser) {
                existingUser.socketID = socket.id;
                socket.join(data.roomId);
                connectedUsers.push({ socketID: socket.id, roomID: data.roomId, identity: data.identity });
                console.log(`User ${socket.id} rejoined room ${data.roomId} with identity ${data.identity}`);
            } else if (room.participants.length < 4) {
                socket.join(data.roomId);
                room.participants.push({ socketID: socket.id, identity: data.identity });
                connectedUsers.push({ socketID: socket.id, roomID: data.roomId, identity: data.identity });
                console.log(`User ${socket.id} joined room ${data.roomId} with identity ${data.identity}`);
                
                // Notify existing participants about the new user
                socket.to(data.roomId).emit('user-joined', { userID: socket.id, identity: data.identity });
                
                // If there are existing participants, notify the new user
                if (room.participants.length > 1) {
                    socket.emit('existing-participants', room.participants.filter(p => p.socketID !== socket.id));
                }
            } else {
                socket.emit('error', { message: 'Room is full' });
            }
            socket.emit('room-joined', { roomID: data.roomId });

            console.log('Connected Users:', connectedUsers);
            io.to(data.roomId).emit('update-participants', room.participants);
        } else {
            socket.emit('error', { message: 'Room not found' });
        }
    });

    socket.on("join-chat-room", ({ roomId }) => {
        console.log(`User ${socket.id} joining chat room ${roomId}`);
        socket.join(roomId);
    });

    socket.on('leave-room', () => {
        const user = connectedUsers.find(user => user.socketID === socket.id);
        if (user) {
            const roomID = user.roomID;
            connectedUsers = connectedUsers.filter(user => user.socketID !== socket.id);
            console.log('Remaining Connected Users:', connectedUsers);
            const room = rooms.find(room => room.roomID === roomID);
            if (room) {
                room.participants = room.participants.filter(participant => participant.socketID !== socket.id);
                if (room.host === socket.id) {
                    if (room.participants.length > 0) {
                        room.host = room.participants[0].socketID;
                        io.to(roomID).emit('new-host', { newHostID: room.host });
                    }
                }
                io.to(roomID).emit('update-participants', room.participants);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected ${socket.id}`);
        const user = connectedUsers.find(user => user.socketID === socket.id);
        if (user) {
            const roomID = user.roomID;
            connectedUsers = connectedUsers.filter(user => user.socketID !== socket.id);
            console.log('Remaining Connected Users:', connectedUsers);
            const room = rooms.find(room => room.roomID === roomID);
            if (room) {
                room.participants = room.participants.filter(participant => participant.socketID !== socket.id);
                if (room.host === socket.id) {
                    if (room.participants.length > 0) {
                        room.host = room.participants[0].socketID;
                        io.to(roomID).emit('new-host', { newHostID: room.host });
                    }
                }
                io.to(roomID).emit('update-participants', room.participants);
                socket.to(roomID).emit('user-disconnected', socket.id);
            }
        }
    });
});

//chat server ---------------------------------------------------------------------- 
// API Route for Chat Messages (Send Message)
app.post("/api/rooms/:roomId", async (req, res) => {
    const { roomId } = req.params;
    const { username, message } = req.body;

    try {
        const messageRef = db.collection("rooms").doc(roomId).collection("messages").doc();
        await messageRef.set({
            sender: username,
            text: message,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        const savedMessage = await messageRef.get();
        const messageData = savedMessage.data();

        io.to(roomId).emit("new-message", {
            username,
            message,
            timestamp: messageData.timestamp ? messageData.timestamp.toDate().toISOString() : null,
        });



        res.json({ success: true, message: "Message sent!" });
    } catch (error) {
        res.status(500).json({ error: "Error sending message", details: error.message });
    }
});

// API Route for Chat Messages (Fetch Messages)
app.get("/api/rooms/:roomId", async (req, res) => {
    const { roomId } = req.params;

    try {
        const messagesRef = db.collection("rooms").doc(roomId).collection("messages").orderBy("timestamp", "asc");
        const snapshot = await messagesRef.get();

        const messages = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                sender: data.sender || "Unknown", // Avoid crashes if sender is missing
                text: data.text || "", // Ensure text is not undefined
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null, // Convert Firestore timestamp to ISO format

            };
        });

        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ error: "Error fetching messages", details: error.message });
    }
});
//-----------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});