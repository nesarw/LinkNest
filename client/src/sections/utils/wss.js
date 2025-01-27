import io from 'socket.io-client';
import { store } from '../../redux/store';
import { updateRoomID } from '../../redux/slices/app';
import { handleRemoteStream, removeRemoteStream } from './webRTCHandler';

// Determine server URL based on environment
const getServerUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = process.env.NODE_ENV === 'production' ? window.location.port : '8000';
    
    // For ngrok URLs
    if (hostname.includes('ngrok')) {
        return `${protocol}//${hostname}`;
    }
    
    // For local development
    return process.env.NODE_ENV === 'production' 
        ? `${protocol}//${hostname}${port ? `:${port}` : ''}`
        : `http://localhost:${port}`;
};

const socketOptions = {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    secure: window.location.protocol === 'https:',
    rejectUnauthorized: false
};

export let socket = null;
const peerConnections = {};
let isInitiator = false;
const connectedPeers = new Set();

const createPeerConnection = (userID) => {
    // If we already have a connection for this user, clean it up first
    if (peerConnections[userID]) {
        peerConnections[userID].close();
        delete peerConnections[userID];
        removeRemoteStream(userID);
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

    // Handle incoming tracks only if we haven't processed this peer before
    peerConnection.ontrack = (event) => {
        if (!connectedPeers.has(userID)) {
            handleRemoteStream(event.streams[0], userID);
            connectedPeers.add(userID);
        }
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
    const serverUrl = getServerUrl();
    socket = io(serverUrl, socketOptions);
    
    socket.on('connect', () => {
        console.log('Connected to socket server:', socket.id);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Try to reconnect with polling if websocket fails
        if (socketOptions.transports[0] === 'websocket') {
            socketOptions.transports = ['polling', 'websocket'];
            socket.disconnect();
            socket = io(serverUrl, socketOptions);
        }
    });

    socket.on('room-created', (data) => {
        const { roomID } = data;
        store.dispatch(updateRoomID(roomID));
        isInitiator = true;
    });

    socket.on('user-joined', async (data) => {
        console.log('User joined:', data);
        const { userID, identity } = data;
        
        // Only create offer if we're already in the room (initiator) and haven't connected to this peer
        if (isInitiator && !connectedPeers.has(userID)) {
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
        
        // Only accept offer if we haven't connected to this peer
        if (!connectedPeers.has(from)) {
            const peerConnection = createPeerConnection(from);
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('answer', { target: from, answer });
            } catch (err) {
                console.error('Error handling offer:', err);
            }
        }
    });

    socket.on('answer', async (data) => {
        const { answer, from } = data;
        try {
            const peerConnection = peerConnections[from];
            if (peerConnection && peerConnection.signalingState !== 'stable') {
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
            if (peerConnection && peerConnection.remoteDescription) {
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
            connectedPeers.delete(userID);
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
    // Clear any existing connections when joining a new room
    connectedPeers.clear();
    Object.values(peerConnections).forEach(connection => {
        connection.close();
    });
    Object.keys(peerConnections).forEach(key => delete peerConnections[key]);
    
    socket.emit("join-room", { roomId, identity });
};

export const disconnectFromRoom = () => {
    Object.values(peerConnections).forEach(connection => {
        connection.close();
    });
    Object.keys(peerConnections).forEach(key => delete peerConnections[key]);
    connectedPeers.clear();
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
        Object.keys(peerConnections).forEach(key => delete peerConnections[key]);
        connectedPeers.clear();
    }
};