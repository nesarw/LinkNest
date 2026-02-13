const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const db = require("./firebase");
const admin = require("firebase-admin");
const crypto = require('crypto');
require('dotenv').config();

const PORT = process.env.PORT ||  8000;

const app = express();
const server = http.createServer(app);

// Middleware
// Configure CORS with specific origin instead of wildcard
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Limit JSON payload size to prevent DoS
app.use(express.json({ limit: '10kb' }));

let connectedUsers = [];
let rooms = [];
let previousRoomIDs = new Set();

// Input validation helpers
const sanitizeString = (str, maxLength = 100) => {
    if (typeof str !== 'string') return '';
    // Remove potential XSS characters and limit length
    return str.replace(/[<>'"]/g, '').substring(0, maxLength).trim();
};

const isValidRoomID = (roomID) => {
    if (typeof roomID !== 'string') return false;
    // Room IDs should be alphanumeric and 9 characters
    return /^[A-Z0-9]{9}$/i.test(roomID);
};

// Function to generate a cryptographically secure 9-character alphanumeric room ID
const generateRoomID = () => {
    // Use crypto.randomBytes for cryptographically secure random generation
    const buffer = crypto.randomBytes(6);
    return buffer.toString('base64')
        .replace(/[+/=]/g, '') // Remove base64 special chars
        .substring(0, 9)
        .toUpperCase();
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
    
    // Validate room ID format
    if (!isValidRoomID(roomID)) {
        return res.status(400).json({ error: 'Invalid room ID format' });
    }
    
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
        origin: function(origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                return callback(new Error('CORS policy violation'), false);
            }
            return callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log(`A user connected ${socket.id}`);

    socket.on('create-new-room', (data) => {
        // Validate and sanitize identity
        if (!data || !data.identity) {
            socket.emit('error', { message: 'Identity is required' });
            return;
        }
        
        const identity = sanitizeString(data.identity, 50);
        if (identity.length === 0) {
            socket.emit('error', { message: 'Invalid identity' });
            return;
        }
        
        const roomID = generateUniqueRoomID();
        socket.join(roomID);
        console.log(`Room created with ID: ${roomID}`);
        rooms.push({ roomID, participants: [{ socketID: socket.id, identity }], host: socket.id });
        connectedUsers.push({ socketID: socket.id, roomID, identity });
        console.log('Connected Users:', connectedUsers);
        socket.emit('room-created', { roomID });
        io.to(roomID).emit('update-participants', rooms.find(room => room.roomID === roomID).participants);
    });



    // Handle WebRTC signaling
    socket.on('offer', (data) => {
        const { target, offer, isScreenShare } = data;
        console.log(`Received offer from ${socket.id} to ${target}`, isScreenShare ? '(screen share)' : '(camera)');
        socket.to(target).emit('offer', { offer, from: socket.id, isScreenShare });
    });

    socket.on('answer', (data) => {
        const { target, answer, isScreenShare } = data;
        console.log(`Received answer from ${socket.id} to ${target}`, isScreenShare ? '(screen share)' : '(camera)');
        socket.to(target).emit('answer', { answer, from: socket.id, isScreenShare });
    });

    socket.on('ice-candidate', (data) => {
        const { target, candidate } = data;
        console.log(`Received ICE candidate from ${socket.id} to ${target}`);
        socket.to(target).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('join-room', (data) => {
        // Validate input
        if (!data || !data.roomId || !data.identity) {
            socket.emit('error', { message: 'Room ID and identity are required' });
            return;
        }
        
        // Validate room ID format
        if (!isValidRoomID(data.roomId)) {
            socket.emit('error', { message: 'Invalid room ID format' });
            return;
        }
        
        // Sanitize identity
        const identity = sanitizeString(data.identity, 50);
        if (identity.length === 0) {
            socket.emit('error', { message: 'Invalid identity' });
            return;
        }
        
        const room = rooms.find(room => room.roomID === data.roomId);
        if (room) {
            // First check if this socket ID already exists in the room
            const sameSocketUser = room.participants.find(participant => participant.socketID === socket.id);
            if (sameSocketUser) {
                // This is a rejoin with the same socket ID but different identity
                const oldIdentity = sameSocketUser.identity;
                sameSocketUser.identity = identity;
                
                // Notify all users in the room about the identity change
                socket.to(data.roomId).emit('user-identity-changed', {
                    userID: socket.id,
                    oldIdentity: oldIdentity,
                    newIdentity: identity
                });
                
                console.log(`User ${socket.id} updated identity from ${oldIdentity} to ${identity} in room ${data.roomId}`);
                io.to(data.roomId).emit('update-participants', room.participants);
                return;
            }

            // Check for existing user with same identity
            const existingUser = room.participants.find(participant => participant.identity === identity);
            if (existingUser && existingUser.socketID !== socket.id) {
                // Remove old socket ID from connected users
                connectedUsers = connectedUsers.filter(user => user.socketID !== existingUser.socketID);
                
                // Store old socket ID and identity
                const oldSocketID = existingUser.socketID;
                
                // Update the existing user's socket ID
                existingUser.socketID = socket.id;
                socket.join(data.roomId);
                
                // Add new connection to connected users
                connectedUsers.push({ socketID: socket.id, roomID: data.roomId, identity });
                
                // Notify all users in the room about the rejoin
                socket.to(data.roomId).emit('user-rejoined', { 
                    oldSocketID: oldSocketID,
                    newSocketID: socket.id,
                    identity
                });
                
                console.log(`User ${socket.id} rejoined room ${data.roomId} with identity ${identity}`);
            } else if (room.participants.length < 4) {
                socket.join(data.roomId);
                room.participants.push({ socketID: socket.id, identity });
                connectedUsers.push({ socketID: socket.id, roomID: data.roomId, identity });
                console.log(`User ${socket.id} joined room ${data.roomId} with identity ${identity}`);
                
                // Notify existing participants about the new user
                socket.to(data.roomId).emit('user-joined', { userID: socket.id, identity });
                
                // If there are existing participants, notify the new user with their identities
                if (room.participants.length > 1) {
                    const existingParticipants = room.participants.filter(p => p.socketID !== socket.id);
                    existingParticipants.forEach(participant => {
                        socket.emit('user-joined', { 
                            userID: participant.socketID, 
                            identity: participant.identity 
                        });
                    });
                }
            } else {
                socket.emit('error', { message: 'Room is full' });
            }

            console.log('Connected Users:', connectedUsers);
            io.to(data.roomId).emit('update-participants', room.participants);
        } else {
            socket.emit('error', { message: 'Room not found' });
        }
    });

    socket.on("join-chat-room", (data) => {
        // Validate input
        if (!data || !data.roomId) {
            return;
        }
        
        // Validate room ID format
        if (!isValidRoomID(data.roomId)) {
            return;
        }
        
        console.log(`User ${socket.id} joining chat room ${data.roomId}`);
        socket.join(data.roomId);
    });

    socket.on('leave-room', () => {
        const user = connectedUsers.find(user => user.socketID === socket.id);
        if (user) {
            const roomID = user.roomID;
            const userID = socket.id;
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
                
                // Explicitly notify all users in the room that this user has disconnected
                console.log(`Notifying all users in room ${roomID} that user ${userID} has disconnected`);
                socket.to(roomID).emit('user-disconnected', userID);
                
                // If this was the last user in the room, clean up the room
                if (room.participants.length === 0) {
                    console.log(`Room ${roomID} is empty, cleaning up`);
                    rooms = rooms.filter(r => r.roomID !== roomID);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected ${socket.id}`);
        const user = connectedUsers.find(user => user.socketID === socket.id);
        if (user) {
            const roomID = user.roomID;
            const userID = socket.id;
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
                
                // Explicitly notify all users in the room that this user has disconnected
                console.log(`Notifying all users in room ${roomID} that user ${userID} has disconnected`);
                socket.to(roomID).emit('user-disconnected', userID);
                
                // If this was the last user in the room, clean up the room
                if (room.participants.length === 0) {
                    console.log(`Room ${roomID} is empty, cleaning up`);
                    rooms = rooms.filter(r => r.roomID !== roomID);
                }
            }
        }
    });
});

//chat server ---------------------------------------------------------------------- 
// API Route for Chat Messages (Send Message)
app.post("/api/rooms/:roomId", async (req, res) => {
    const { roomId } = req.params;
    const { username, message } = req.body;

    // Validate room ID
    if (!isValidRoomID(roomId)) {
        return res.status(400).json({ error: "Invalid room ID format" });
    }

    // Validate and sanitize inputs
    if (!username || !message) {
        return res.status(400).json({ error: "Username and message are required" });
    }

    const sanitizedUsername = sanitizeString(username, 50);
    const sanitizedMessage = sanitizeString(message, 500);

    if (sanitizedUsername.length === 0 || sanitizedMessage.length === 0) {
        return res.status(400).json({ error: "Invalid username or message" });
    }

    try {
        const messageRef = db.collection("rooms").doc(roomId).collection("messages").doc();
        await messageRef.set({
            sender: sanitizedUsername,
            text: sanitizedMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        const savedMessage = await messageRef.get();
        const messageData = savedMessage.data();

        io.to(roomId).emit("new-message", {
            username: sanitizedUsername,
            message: sanitizedMessage,
            timestamp: messageData.timestamp ? messageData.timestamp.toDate().toISOString() : null,
        });



        res.json({ success: true, message: "Message sent!" });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: "Error sending message" });
    }
});

// API Route for Chat Messages (Fetch Messages)
app.get("/api/rooms/:roomId", async (req, res) => {
    const { roomId } = req.params;

    // Validate room ID
    if (!isValidRoomID(roomId)) {
        return res.status(400).json({ error: "Invalid room ID format" });
    }

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
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: "Error fetching messages" });
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