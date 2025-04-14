import io from 'socket.io-client';
import { store } from '../../redux/store';
import { updateRoomID } from '../../redux/slices/app';
import { 
    handleRemoteStream, 
    removeRemoteStream, 
    getLocalStream, 
    getScreenStream,
    getPeerInfo,
    updatePeerInfo,
    updateGridLayout
} from './webRTCHandler';
import * as webRTCHandler from './webRTCHandler';

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

// Using environment variables for sensitive credentials
const METERED_API_KEY = import.meta.env.VITE_METERED_API_KEY;
const METERED_USERNAME = import.meta.env.VITE_METERED_USERNAME;
const METERED_CREDENTIAL = import.meta.env.VITE_METERED_CREDENTIAL;

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

const createPeerConnection = (userID, identity) => {
    if (peerConnections[userID]) {
        peerConnections[userID].close();
        delete peerConnections[userID];
        removeRemoteStream(userID);
    }

    console.log('Creating peer connection for:', userID, 'with identity:', identity);
    const peerConnection = new RTCPeerConnection(getIceServers());
    peerConnections[userID] = peerConnection;

    // Store the identity with the peer connection
    peerConnection.identity = identity;

    // Add local stream tracks
    const localStream = getLocalStream();
    const screenStream = getScreenStream();

    if (localStream) {
        console.log('Adding local tracks to peer connection');
        localStream.getTracks().forEach(track => {
            console.log('Adding track to peer connection:', track.kind, track.label);
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
    }

    // Add screen sharing stream if active
    if (screenStream) {
        console.log('Adding screen sharing tracks to peer connection');
        screenStream.getTracks().forEach(track => {
            track.contentHint = 'screen';
            console.log('Adding screen track to peer connection:', track.kind, track.label);
            const sender = peerConnection.addTrack(track, screenStream);
            if (sender) {
                const params = sender.getParameters();
                if (!params.encodings) {
                    params.encodings = [{}];
                }
                params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps for screen sharing
                params.encodings[0].maxFramerate = 30;
                sender.setParameters(params).catch(console.error);
            }
        });
    }

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind, 'contentHint:', event.track.contentHint, 'label:', event.track.label);
        const [remoteStream] = event.streams;
        
        if (remoteStream) {
            // Check if this is a screen sharing stream
            const isScreenShare = event.track.contentHint === 'screen' || // Check for screen sharing hint
                                remoteStream.id.includes('screen') || // Fallback checks
                                event.track.label.includes('screen') || 
                                event.track.label.includes('display') ||
                                event.track.label.includes('share') ||
                                event.track.label.includes('window') ||
                                // Check if this track is from a screen share offer
                                (peerConnection.lastOffer && peerConnection.lastOffer.isScreenShare);

            console.log('Processing remote stream for:', userID, isScreenShare ? '(screen)' : '(camera)', 'stream ID:', remoteStream.id);
            
            // Create a new MediaStream for this track
            const streamToHandle = new MediaStream([event.track]);
            
            // Ensure audio tracks are enabled
            streamToHandle.getAudioTracks().forEach(track => {
                track.enabled = true;
                console.log('Remote audio track enabled:', track.label);
            });
            
            // Handle the stream based on its type
            handleRemoteStream(streamToHandle, userID, isScreenShare);
            
            if (!isScreenShare) {
                connectedPeers.add(userID);
            }

            // Monitor track status
            event.track.onended = () => {
                console.log(`Remote ${event.track.kind} track ended for peer:`, userID);
                if (isScreenShare) {
                    console.log(`Screen share track ended for peer: ${userID}, cleaning up UI`);
                    
                    // Remove the screen container
                    const screenContainer = document.querySelector(`.screen-share-container[data-peer="${userID}"]`);
                    if (screenContainer) {
                        screenContainer.remove();
                    }
                    
                    // Hide the screen share container and update layout
                    const screenShareContainer = document.getElementById('screen-share-container');
                    if (screenShareContainer) {
                        screenShareContainer.style.display = 'none';
                        screenShareContainer.innerHTML = '';
                    }
                    
                    // Update peer information
                    const peer = getPeerInfo(userID);
                    if (peer) {
                        peer.isScreenShare = false;
                        updatePeerInfo(userID, peer);
                    }
                    
                    // Update the grid layout
                    updateGridLayout();
                } else {
                    // Handle regular video track ending
                    console.log(`Video track ended for peer: ${userID}, cleaning up UI`);
                    
                    // Find and remove the video element
                    const videoGrid = document.getElementById('video-grid');
                    if (videoGrid) {
                        const videoWrappers = videoGrid.querySelectorAll('div');
                        videoWrappers.forEach(wrapper => {
                            const video = wrapper.querySelector('video');
                            if (video && video.srcObject === remoteStream) {
                                console.log('Removing video element for peer:', userID);
                                wrapper.remove();
                                
                                // Update peer information
                                const peer = getPeerInfo(userID);
                                if (peer) {
                                    peer.hasVideo = false;
                                    updatePeerInfo(userID, peer);
                                }
                                
                                // Update the grid layout
                                updateGridLayout();
                            }
                        });
                    }
                }
            };
            
            // Add mute/unmute listeners for all tracks
            // For screen tracks, completely disable the event handlers
            if (event.track.contentHint === 'screen' || event.track.isScreenTrack) {
                // For screen tracks, completely disable the event handlers
                event.track.onmute = null;
                event.track.onunmute = null;
                
                // Ensure screen track is always enabled
                event.track.enabled = true;
                
                console.log(`Screen track detected for peer: ${userID}, disabled mute/unmute handlers`);
            } else {
                // For non-screen tracks, use minimal event handlers
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
                console.log('ICE Connection failed, cleaning up and restarting...');
                // Clean up UI elements before restarting
                removeRemoteStream(userID);
                restartConnection(userID);
                break;
            case 'disconnected':
                console.log('ICE Connection disconnected, cleaning up and attempting to recover...');
                // Clean up UI elements before attempting to recover
                removeRemoteStream(userID);
                setTimeout(() => {
                    if (peerConnection.iceConnectionState === 'disconnected') {
                        restartConnection(userID);
                    }
                }, 2000);
                break;
            case 'closed':
                console.log('ICE Connection closed, cleaning up...');
                // Clean up UI elements when connection is closed
                removeRemoteStream(userID);
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
            
            // Clean up any existing UI elements before restarting
            removeRemoteStream(userID);
            
            const offer = await peerConnection.createOffer({ 
                iceRestart: true,
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', { target: userID, offer });
            
            // Set a timeout to check if the connection was successfully restarted
            setTimeout(() => {
                if (peerConnection.iceConnectionState === 'disconnected' || 
                    peerConnection.iceConnectionState === 'failed') {
                    console.log('Connection restart failed for:', userID, 'cleaning up...');
                    // If the connection is still disconnected or failed after the timeout,
                    // clean up the peer connection
                    peerConnection.close();
                    delete peerConnections[userID];
                    connectedPeers.delete(userID);
                    removeRemoteStream(userID);
                }
            }, 10000); // 10 seconds timeout
        }
    } catch (err) {
        console.error('Error restarting connection:', err);
        // If there's an error, clean up the peer connection
        if (peerConnections[userID]) {
            peerConnections[userID].close();
            delete peerConnections[userID];
            connectedPeers.delete(userID);
            removeRemoteStream(userID);
        }
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
                const peerConnection = createPeerConnection(userID, identity);
                
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
        } else if (!isInitiator) {
            // For non-initiators, create peer connection for existing users
            try {
                if (!peerConnections[userID]) {
                    const peerConnection = createPeerConnection(userID, identity);
                    console.log('Created peer connection for existing user:', userID, 'with identity:', identity);
                }
            } catch (err) {
                console.error('Error creating peer connection for existing user:', err);
            }
        }
    });

    socket.on('offer', async (data) => {
        const { offer, from, isScreenShare } = data;
        console.log('Received offer from:', from, isScreenShare ? '(screen share)' : '(camera)');
        
        try {
            let peerConnection = peerConnections[from];
            if (!peerConnection) {
                peerConnection = createPeerConnection(from, peerConnections[from]?.identity);
            }
            
            // Store the screen share metadata with the peer connection
            peerConnection.lastOffer = { isScreenShare };
            
            // If this is an offer indicating screen sharing has stopped, clean up the UI
            if (isScreenShare === false && peerConnection.lastScreenShareState === true) {
                console.log(`Screen sharing stopped for peer: ${from}, cleaning up UI`);
                
                // Remove the screen container
                const screenContainer = document.querySelector(`.screen-share-container[data-peer="${from}"]`);
                if (screenContainer) {
                    screenContainer.remove();
                }
                
                // Hide the screen share container and update layout
                const screenShareContainer = document.getElementById('screen-share-container');
                if (screenShareContainer) {
                    screenShareContainer.style.display = 'none';
                    screenShareContainer.innerHTML = '';
                }
                
                // Update peer information
                const peer = getPeerInfo(from);
                if (peer) {
                    peer.isScreenShare = false;
                    updatePeerInfo(from, peer);
                }
                
                // Update the grid layout
                updateGridLayout();
            }
            
            // Update the last screen share state
            peerConnection.lastScreenShareState = isScreenShare;
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(answer);
            
            console.log('Sending answer to:', from, isScreenShare ? '(screen share)' : '(camera)');
            socket.emit('answer', { 
                target: from, 
                answer,
                isScreenShare 
            });
        } catch (err) {
            console.error('Error handling offer:', err);
        }
    });

    socket.on('answer', async (data) => {
        const { answer, from, isScreenShare } = data;
        console.log('Received answer from:', from, isScreenShare ? '(screen share)' : '(camera)');
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
        console.log('User disconnected event received for:', userID);
        
        // Clean up peer connection
        if (peerConnections[userID]) {
            console.log('Closing peer connection for:', userID);
            peerConnections[userID].close();
            delete peerConnections[userID];
            connectedPeers.delete(userID);
        }
        
        // Ensure UI elements are removed
        console.log('Removing remote stream for disconnected user:', userID);
        removeRemoteStream(userID);
        
        // Clean up all video elements in the video grid
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            // Find all wrappers that belong to the disconnected user
            const videoWrappers = videoGrid.querySelectorAll(`div[data-peer="${userID}"], div:has(video[data-peer="${userID}"])`);
            videoWrappers.forEach(wrapper => {
                console.log('Removing entire wrapper for disconnected user:', userID);
                wrapper.remove(); // This removes the wrapper and all its children (video, labels, icons)
            });
            
            // Force grid layout update
            const remainingWrappers = videoGrid.querySelectorAll('div');
            console.log('Remaining video elements:', remainingWrappers.length);
            updateGridLayout();
        }
        
        // Clean up screen share elements if they exist
        const screenContainer = document.querySelector(`.screen-share-container[data-peer="${userID}"]`);
        if (screenContainer) {
            console.log('Removing screen share container for disconnected user:', userID);
            screenContainer.remove();
            
            // Hide the screen share container if it's empty
            const screenShareContainer = document.getElementById('screen-share-container');
            if (screenShareContainer) {
                const remainingScreens = screenShareContainer.querySelectorAll('.screen-share-container');
                if (remainingScreens.length === 0) {
                    console.log('No remaining screen shares, hiding container');
                    screenShareContainer.style.display = 'none';
                    screenShareContainer.innerHTML = '';
                }
            }
        }
        
        // Final grid layout update after all cleanups
        requestAnimationFrame(() => {
            updateGridLayout();
        });
    });

    // Handle kicked-from-room event
    socket.on('kicked-from-room', (data) => {
        console.log('Kicked from room:', data);
        
        // Show notification
        alert(data.message);
        
        // Clean up all connections
        Object.values(peerConnections).forEach(connection => {
            connection.close();
        });
        Object.keys(peerConnections).forEach(key => delete peerConnections[key]);
        connectedPeers.clear();
        
        // Redirect to homepage
        window.location.href = '/';
    });

    socket.on('existing-participants', (participants) => {
        isInitiator = true;
    });

    socket.on('user-identity-changed', (data) => {
        console.log('User identity changed:', data);
        const { userID, oldIdentity, newIdentity } = data;
        
        // Update identity in peer connection
        if (peerConnections[userID]) {
            peerConnections[userID].identity = newIdentity;
        }
        
        // Update identity labels in video grid
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            const videoWrappers = videoGrid.querySelectorAll('div');
            videoWrappers.forEach(wrapper => {
                const video = wrapper.querySelector('video');
                const identityLabel = wrapper.querySelector('.identity-label');
                if (video && video.dataset.peer === userID && identityLabel) {
                    identityLabel.textContent = newIdentity;
                }
            });
        }
        
        // Update identity in screen share container if exists
        const screenContainer = document.querySelector(`.screen-share-container[data-peer="${userID}"]`);
        if (screenContainer) {
            const identityLabel = screenContainer.querySelector('.identity-label');
            if (identityLabel) {
                identityLabel.textContent = newIdentity;
            }
        }
    });

    socket.on('user-rejoined', async (data) => {
        console.log('User rejoined event received:', data);
        const { oldSocketID, newSocketID, identity } = data;
        
        // Clean up old peer connection if it exists
        if (peerConnections[oldSocketID]) {
            console.log('Cleaning up old peer connection:', oldSocketID);
            peerConnections[oldSocketID].close();
            delete peerConnections[oldSocketID];
            connectedPeers.delete(oldSocketID);
        }
        
        // Remove any existing UI elements for the old socket ID
        removeRemoteStream(oldSocketID);
        
        // Create new peer connection for the rejoined user
        const peerConnection = new RTCPeerConnection(getIceServers());
        peerConnections[newSocketID] = peerConnection;
        
        // Store the identity with the peer connection
        peerConnection.identity = identity;
        
        // Add local stream tracks to the new peer connection
        const localStream = getLocalStream();
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        
        // Add screen sharing tracks if active
        const screenStream = getScreenStream();
        if (screenStream) {
            screenStream.getTracks().forEach(track => {
                track.contentHint = 'screen';
                peerConnection.addTrack(track, screenStream);
            });
        }
        
        // Set up event handlers for the new peer connection
        peerConnection.ontrack = (event) => {
            console.log('Received remote track from rejoined user:', event.track.kind);
            const [remoteStream] = event.streams;
            if (remoteStream) {
                const isScreenShare = event.track.contentHint === 'screen' || 
                                    remoteStream.id.includes('screen') || 
                                    event.track.label.includes('screen');
                
                handleRemoteStream(remoteStream, newSocketID, isScreenShare);
            }
        };
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    target: newSocketID,
                    candidate: event.candidate
                });
            }
        };
        
        // Create and send a new offer to the rejoined user
        try {
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', { target: newSocketID, offer });
        } catch (err) {
            console.error('Error creating offer for rejoined user:', err);
        }
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
        console.log('Leaving room, cleaning up all connections and UI elements');
        
        // First, stop screen sharing if active
        const screenStream = webRTCHandler.getScreenStream();
        if (screenStream) {
            console.log('Stopping screen sharing before leaving room');
            webRTCHandler.stopScreenSharing();
        }
        
        // Clean up all UI elements for all peers
        Object.keys(peerConnections).forEach(userId => {
            console.log('Cleaning up UI elements for peer:', userId);
            removeRemoteStream(userId);
        });
        
        // Close all peer connections
        Object.values(peerConnections).forEach(connection => {
            connection.close();
        });
        
        // Clear all peer connections
        Object.keys(peerConnections).forEach(key => delete peerConnections[key]);
        connectedPeers.clear();
        
        // Emit leave-room event to the server
        socket.emit('leave-room');
        
        // Double-check if any video elements still exist
        setTimeout(() => {
            const videoGrid = document.getElementById('video-grid');
            if (videoGrid) {
                console.log('Double-checking for remaining video elements');
                const videoWrappers = videoGrid.querySelectorAll('div');
                let foundRemainingElements = false;
                
                videoWrappers.forEach(wrapper => {
                    const video = wrapper.querySelector('video');
                    if (video && video.srcObject) {
                        console.log('Found remaining video element, removing');
                        wrapper.remove();
                        foundRemainingElements = true;
                    }
                });
                
                if (foundRemainingElements) {
                    updateGridLayout();
                }
            }
            
            // Also check for screen share elements
            const screenShareContainer = document.getElementById('screen-share-container');
            if (screenShareContainer) {
                console.log('Cleaning up screen share container');
                screenShareContainer.style.display = 'none';
                screenShareContainer.innerHTML = '';
            }
        }, 500);
    }
};

export const getPeerConnections = () => peerConnections;

export const updatePeerConnections = (stream, isScreenShare = false) => {
    Object.entries(peerConnections).forEach(([userId, peerConnection]) => {
        const senders = peerConnection.getSenders();
        
        stream.getTracks().forEach(track => {
            if (isScreenShare) {
                track.contentHint = 'screen';
                track.enabled = true; // Ensure screen sharing tracks are enabled
            }
            
            const sender = senders.find(s => 
                s.track && s.track.kind === track.kind && 
                (isScreenShare ? s.track.contentHint === 'screen' : s.track.contentHint !== 'screen')
            );
            
            if (sender) {
                sender.replaceTrack(track).catch(console.error);
            } else {
                peerConnection.addTrack(track, stream);
            }

            // Set encoding parameters
            if (track.kind === 'video') {
                const sender = peerConnection.getSenders().find(s => s.track === track);
                if (sender) {
                    const params = sender.getParameters();
                    if (!params.encodings) {
                        params.encodings = [{}];
                    }
                    params.encodings[0].maxBitrate = isScreenShare ? 2500000 : 1000000; // 2.5 Mbps for screen, 1 Mbps for camera
                    params.encodings[0].maxFramerate = 30;
                    sender.setParameters(params).catch(console.error);
                }
            }
        });
    });
};