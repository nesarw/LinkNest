const express = require('express');
const http = require('http');
const {v4:uuidv4} = require('uuid');
const cors = require('cors');
const twilio = require('twilio');

const PORT = process.env.PORT || 8000;

const app =  express();
const server = http.createServer(app); 

app.use(cors());

let connectedUsers = [];
let rooms = [];

app.get('/api/rooms-exists/:roomID', (req, res) => {
    const roomID = req.params;
    const room = rooms.find(room => room.roomID === roomID);
    if(room) {
        //send res room exist reuqest
        if (connectedUsers.length > 3) {
            return res.status(200).json({roomExists: true, full: true});
        }else {
            return res.status(200).json({roomExists: true, full: false});
        }
    } else {
        return res.status(200).json({roomExists: false});
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
        createNewRoomHandler(data, socket);
    });
    // socket.on('create-new-room', (roomID, userID) => {
    //     console.log('User joined room');
    //     socket.join(roomID);
    //     socket.to(roomID).broadcast.emit('user-connected', userID);
    //     socket.on('disconnect', () => {
    //         socket.to(roomID).broadcast.emit('user-disconnected', userID);
    //     });
    // });
});

const createNewRoomHandler = () => {
    console.log("user host room.");
    console.log(data);
    const {identity} = data;
    const roomId = uuidv4();

    const newUser = {
        identity,
        id: uuidv4(),
        socketId: socket.id,
        roomId,
    }
    //add user to connected users
    connectedUsers = [...connectedUsers, newUser];

    //create a new room
    const newRoom = {
        id: roomId,
        host: newUser,
        connectedUsers: [newUser],
    };

    //join socket room
    socket.join(roomId);
    rooms = [...rooms, newRoom];

    //emit to host user/client with roomID
    socket.emit('room-created', {roomID: roomId});
};

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});