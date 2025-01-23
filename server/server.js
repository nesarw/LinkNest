const express = require('express');
const http = require('http');
const cors = require('cors');
const twilio = require('twilio');

const PORT = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);

app.use(cors());

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

    socket.on('regenerate-room-id', () => {
        const user = connectedUsers.find(user => user.socketID === socket.id);
        if (user) {
            const oldRoomID = user.roomID;
            const room = rooms.find(room => room.roomID === oldRoomID);
            if (room && room.host === socket.id) {
                const newRoomID = generateUniqueRoomID();
                room.roomID = newRoomID;
                user.roomID = newRoomID;
                socket.leave(oldRoomID);
                socket.join(newRoomID);
                previousRoomIDs.add(newRoomID);
                console.log(`Room ID regenerated from ${oldRoomID} to ${newRoomID}`);
                io.to(oldRoomID).emit('room-id-regenerated', { newRoomID });
                io.to(newRoomID).emit('update-participants', room.participants);
            }
        }
    });

    socket.on('join-room', (data) => {
        const room = rooms.find(room => room.roomID === data.roomId);
        if (room) {
            if (room.participants.length < 4) {
                socket.join(data.roomId);
                room.participants.push({ socketID: socket.id, identity: data.identity });
                connectedUsers.push({ socketID: socket.id, roomID: data.roomId, identity: data.identity });
                console.log(`User ${socket.id} joined room ${data.roomId} with identity ${data.identity}`);
                console.log('Connected Users:', connectedUsers);
                socket.to(data.roomId).emit('user-joined', { userID: socket.id, identity: data.identity });
                io.to(data.roomId).emit('update-participants', room.participants);
            } else {
                socket.emit('error', { message: 'Room is full' });
            }
        } else {
            socket.emit('error', { message: 'Room not found' });
        }
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
                    // If the host leaves, assign a new host
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
                    // If the host leaves, assign a new host
                    if (room.participants.length > 0) {
                        room.host = room.participants[0].socketID;
                        io.to(roomID).emit('new-host', { newHostID: room.host });
                    }
                }
                io.to(roomID).emit('update-participants', room.participants);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});