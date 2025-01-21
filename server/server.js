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

// Function to generate a 9-character alphanumeric room ID
const generateRoomID = () => {
    return Math.random().toString(36).substring(2, 11).toUpperCase();
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
        const roomID = generateRoomID();
        socket.join(roomID);
        console.log(`Room created with ID: ${roomID}`);
        rooms.push({ roomID, participants: [socket.id], host: socket.id });
        connectedUsers.push({ socketID: socket.id, roomID });
        socket.emit('room-created', { roomID });
        io.to(roomID).emit('update-participants', rooms.find(room => room.roomID === roomID).participants);
    });

    socket.on('join-room', (roomID) => {
        const room = rooms.find(room => room.roomID === roomID);
        if (room) {
            if (room.participants.length < 4) {
                socket.join(roomID);
                room.participants.push(socket.id);
                connectedUsers.push({ socketID: socket.id, roomID });
                console.log(`User ${socket.id} joined room ${roomID}`);
                socket.to(roomID).emit('user-joined', { userID: socket.id });
                io.to(roomID).emit('update-participants', room.participants);
            } else {
                socket.emit('error', { message: 'Room is full' });
            }
        } else {
            socket.emit('error', { message: 'Room not found' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected ${socket.id}`);
        const user = connectedUsers.find(user => user.socketID === socket.id);
        if (user) {
            const roomID = user.roomID;
            connectedUsers = connectedUsers.filter(user => user.socketID !== socket.id);
            const room = rooms.find(room => room.roomID === roomID);
            if (room) {
                room.participants = room.participants.filter(participant => participant !== socket.id);
                if (room.host === socket.id) {
                    // If the host leaves, remove the room and notify all participants
                    rooms = rooms.filter(room => room.roomID !== roomID);
                    io.to(roomID).emit('room-closed');
                    io.in(roomID).socketsLeave(roomID); // Disconnect all users from the room
                } else if (room.participants.length > 0) {
                    io.to(roomID).emit('update-participants', room.participants);
                } else {
                    rooms = rooms.filter(room => room.roomID !== roomID);
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});