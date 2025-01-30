import io from 'socket.io-client';
import { store } from '../../redux/store';
import { updateRoomID } from '../../redux/slices/app';
import { handleRemoteStream, removeRemoteStream, getLocalStream } from './webRTCHandler';

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
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    secure: window.location.protocol === 'https:',
    rejectUnauthorized: false
};

const METERED_API_KEY = 'cd5bae0ec2cc1dd370a7364ab654ca7aecff';
const METERED_USERNAME = '751e7aff8813c87ff1ddc86e';
const METERED_CREDENTIAL = 'epl85J1pcgrPI0pa';

// Updated ICE server configuration with Metered TURN/STUN servers
const getIceServers = () => ({
    iceServers: [
        {
            urls: [
                'stun:stun.metered.ca:80',
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        },
        {
            urls: [
                'turn:a.relay.metered.ca:80',
                'turn:a.relay.metered.ca:80?transport=tcp',
                'turn:a.relay.metered.ca:443',
                'turn:a.relay.metered.ca:443?transport=tcp'
            ],
            username: METERED_USERNAME,
            credential: METERED_CREDENTIAL
        },
        {
            urls: [
                'turn:b.relay.metered.ca:80',
                'turn:b.relay.metered.ca:80?transport=tcp',
                'turn:b.relay.metered.ca:443',
                'turn:b.relay.metered.ca:443?transport=tcp'
            ],
            username: METERED_USERNAME,
            credential: METERED_CREDENTIAL
        },
        {
            urls: [
                'turn:c.relay.metered.ca:80',
                'turn:c.relay.metered.ca:80?transport=tcp',
                'turn:c.relay.metered.ca:443',
                'turn:c.relay.metered.ca:443?transport=tcp'
            ],
            username: METERED_USERNAME,
            credential: METERED_CREDENTIAL
        }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'relay', // Force TURN relay
    sdpSemantics: 'unified-plan'
});

export let socket = null;
const peerConnections = {};
let isInitiator = false;
const connectedPeers = new Set();

const createPeerConnection = (userID) => {
    if (peerConnections[userID]) {
        peerConnections[userID].close();
        delete peerConnections[userID];
        removeRemoteStream(userID);
    }

    console.log('Creating peer connection for:', userID);
    const peerConnection = new RTCPeerConnection(getIceServers());
    peerConnections[userID] = peerConnection;

    // Add local stream tracks
    const localStream = getLocalStream();
    if (localStream) {
        console.log('Adding local tracks to peer connection');
        localStream.getTracks().forEach(track => {
            console.log('Adding track to peer connection:', track.kind);
            const sender = peerConnection.addTrack(track, localStream);
            
            // Set encoding parameters for better quality
            if (sender && track.kind === 'video') {
                const params = sender.getParameters();
                if (!params.encodings) {
                    params.encodings = [{}];
                }
                params.encodings[0].maxBitrate = 1000000; // 1 Mbps
                params.encodings[0].maxFramerate = 30;
                sender.setParameters(params).catch(console.error);
            }
        });
    } else {
        console.warn('No local stream available when creating peer connection');
    }

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (!connectedPeers.has(userID)) {
            const [remoteStream] = event.streams;
            if (remoteStream) {
                console.log('Processing remote stream for:', userID);
                handleRemoteStream(remoteStream, userID);
                connectedPeers.add(userID);

                // Monitor track status
                event.track.onended = () => {
                    console.log(`Remote ${event.track.kind} track ended for peer:`, userID);
                };
                event.track.onmute = () => {
                    console.log(`Remote ${event.track.kind} track muted for peer:`, userID);
                };
                event.track.onunmute = () => {
                    console.log(`Remote ${event.track.kind} track unmuted for peer:`, userID);
                };
            }
        }
    };

    // Enhanced ICE candidate handling
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Generated ICE candidate type:', event.candidate.type);
            socket.emit('ice-candidate', {
                target: userID,
                candidate: event.candidate
            });
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        console.log(`ICE Connection State with ${userID}:`, state);
        
        switch (state) {
            case 'checking':
                console.log('Checking ICE connection...');
                break;
            case 'connected':
                console.log('ICE Connection established successfully');
                break;
            case 'failed':
                console.log('ICE Connection failed, restarting...');
                restartConnection(userID);
                break;
            case 'disconnected':
                console.log('ICE Connection disconnected, attempting to recover...');
                setTimeout(() => {
                    if (peerConnection.iceConnectionState === 'disconnected') {
                        restartConnection(userID);
                    }
                }, 2000);
                break;
        }
    };

    // Monitor gathering state
    peerConnection.onicegatheringstatechange = () => {
        console.log(`ICE gathering state: ${peerConnection.iceGatheringState}`);
    };

    return peerConnection;
};

const restartConnection = async (userID) => {
    try {
        const peerConnection = peerConnections[userID];
        if (peerConnection) {
            console.log('Restarting connection for:', userID);
            const offer = await peerConnection.createOffer({ 
                iceRestart: true,
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', { target: userID, offer });
        }
    } catch (err) {
        console.error('Error restarting connection:', err);
    }
};

export const connectwithSocketIOServer = () => {
    const serverUrl = getServerUrl();
    socket = io(serverUrl, socketOptions);
    
    socket.on('connect', () => {
        console.log('Connected to socket server:', socket.id);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Fallback to polling if websocket fails
        if (socketOptions.transports[0] === 'websocket') {
            socket.io.opts.transports = ['polling', 'websocket'];
            socket.disconnect().connect();
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
        
        if (isInitiator && !connectedPeers.has(userID)) {
            try {
                const peerConnection = createPeerConnection(userID);
                
                const offer = await peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                
                await peerConnection.setLocalDescription(offer);
                console.log('Sending offer to:', userID);
                socket.emit('offer', { target: userID, offer });
            } catch (err) {
                console.error('Error creating offer:', err);
            }
        }
    });

    socket.on('offer', async (data) => {
        const { offer, from } = data;
        console.log('Received offer from:', from);
        
        if (!connectedPeers.has(from)) {
            try {
                const peerConnection = createPeerConnection(from);
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                console.log('Sending answer to:', from);
                socket.emit('answer', { target: from, answer });
            } catch (err) {
                console.error('Error handling offer:', err);
            }
        }
    });

    socket.on('answer', async (data) => {
        const { answer, from } = data;
        console.log('Received answer from:', from);
        try {
            const peerConnection = peerConnections[from];
            if (peerConnection && peerConnection.signalingState !== 'stable') {
                console.log('Setting remote description from answer');
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (err) {
            console.error('Error handling answer:', err);
        }
    });

    socket.on('ice-candidate', async (data) => {
        const { candidate, from } = data;
        console.log('Received ICE candidate from:', from);
        try {
            const peerConnection = peerConnections[from];
            if (peerConnection && peerConnection.remoteDescription) {
                console.log('Adding ICE candidate');
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error('Error adding ICE candidate:', e));
            }
        } catch (err) {
            console.error('Error processing ICE candidate:', err);
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
    // Clean up existing connections
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

export const updatePeerConnections = (newStream) => {
    Object.entries(peerConnections).forEach(([userId, peerConnection]) => {
        const senders = peerConnection.getSenders();
        newStream.getTracks().forEach(track => {
            const sender = senders.find(s => s.track?.kind === track.kind);
            if (sender) {
                sender.replaceTrack(track);
            }
        });
    });
};