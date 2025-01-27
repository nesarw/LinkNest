import io from 'socket.io-client';
import { store } from '../../redux/store';
import { updateRoomID } from '../../redux/slices/app';
import { handleRemoteStream, removeRemoteStream } from './webRTCHandler';

const server = 'http://localhost:8000';
export let socket = null;

const peerConnections = {};
let isInitiator = false;

const createPeerConnection = (userID) => {
    // If we already have a connection for this user, don't create a new one
    if (peerConnections[userID]) {
        return peerConnections[userID];
    }

    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
    });

    peerConnections[userID] = peerConnection;

    // Add local tracks
    const localVideo = document.querySelector('video[data-local="true"]');
    if (localVideo && localVideo.srcObject) {
        const localStream = localVideo.srcObject;
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
        handleRemoteStream(event.streams[0], userID);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                target: userID,
                candidate: event.candidate
            });
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'failed' || 
            peerConnection.iceConnectionState === 'disconnected') {
            peerConnection.restartIce();
        }
    };

    return peerConnection;
};

export const connectwithSocketIOServer = () => {
    socket = io(server);
    
    socket.on('connect', () => {
        console.log('Connected to socket server:', socket.id);
    });

    socket.on('room-created', (data) => {
        const { roomID } = data;
        store.dispatch(updateRoomID(roomID));
        isInitiator = true;
    });

    socket.on('user-joined', async (data) => {
        console.log('User joined:', data);
        const { userID, identity } = data;
        
        // Only create offer if we're already in the room (initiator)
        if (isInitiator) {
            const peerConnection = createPeerConnection(userID);
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('offer', { target: userID, offer });
            } catch (err) {
                console.error('Error creating offer:', err);
            }
        }
    });

    socket.on('offer', async (data) => {
        const { offer, from } = data;
        
        // Create peer connection if we don't have one yet
        const peerConnection = createPeerConnection(from);
        
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', { target: from, answer });
        } catch (err) {
            console.error('Error handling offer:', err);
        }
    });

    socket.on('answer', async (data) => {
        const { answer, from } = data;
        try {
            const peerConnection = peerConnections[from];
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (err) {
            console.error('Error handling answer:', err);
        }
    });

    socket.on('ice-candidate', async (data) => {
        const { candidate, from } = data;
        try {
            const peerConnection = peerConnections[from];
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (err) {
            console.error('Error adding ICE candidate:', err);
        }
    });

    socket.on('user-disconnected', (userID) => {
        if (peerConnections[userID]) {
            peerConnections[userID].close();
            delete peerConnections[userID];
            removeRemoteStream(userID);
        }
    });

    socket.on('existing-participants', (participants) => {
        isInitiator = true;
    });
};

export const createNewRoom = (identity) => {
    socket.emit("create-new-room", { identity });
};

export const joinRoom = (roomId, identity) => {
    socket.emit("join-room", { roomId, identity });
};

export const disconnectFromRoom = () => {
    Object.values(peerConnections).forEach(connection => {
        connection.close();
    });
    if (socket) {
        socket.disconnect();
    }
};

export const leaveRoom = () => {
    if (socket) {
        socket.emit('leave-room');
        Object.values(peerConnections).forEach(connection => {
            connection.close();
        });
    }
};