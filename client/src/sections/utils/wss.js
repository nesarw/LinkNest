import io from 'socket.io-client';

const server = 'http://localhost:8000';
let socket = null;

export const connectwithSocketIOServer = () => {
    socket = io(server);
    socket.on('connect', () => {
        console.log('Connected to socket server');
        console.log(socket.id);
    });
};

export const createNewRoom = (identity) => {
    //emit to server to create a new room
    const data = {
        identity,
    };
    socket.emit("create-new-room",data);
};

export const joinRoom = (roomId,identity) => {
       //emit to server to join a new room
    const data = {
        roomId,
        identity,
    };
    socket.emit("join-room",data);
};