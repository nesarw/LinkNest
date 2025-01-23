import io from 'socket.io-client';
import { store } from '../../redux/store';
import { updateRoomID } from '../../redux/slices/app';

const server = 'http://localhost:8000';
let socket = null;

export const connectwithSocketIOServer = () => {
    socket = io(server);
    socket.on('connect', () => {
        console.log('Connected to socket server');
        console.log(socket.id);
    });
    socket.on('room-created', (data) => {
        const { roomID } = data;
        store.dispatch(updateRoomID(roomID));
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

export const disconnectFromRoom = () => {
    if (socket) {
        socket.disconnect();
    }
};

export const leaveRoom = () => {
    if (socket) {
        socket.emit('leave-room');
        socket.disconnect();
    }
};