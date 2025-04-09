import { setShowOverlay } from "../../redux/slices/app";
import { store } from "../../redux/store";
import * as wss from "./wss";

const constraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        latency: 0.01,  // Minimize audio latency
        sampleSize: 16  // Standard sample size for good quality/performance balance
    },
    video: {
        width: { min: 320, ideal: 640, max: 1280 },  // Reduced resolution for better performance
        height: { min: 240, ideal: 480, max: 720 },
        frameRate: { ideal: 24 },  // Reduced framerate for better performance
        encodings: [
            {
                maxBitrate: 500000,  // 500kbps for reduced bandwidth usage
                scaleResolutionDownBy: 1.0
            }
        ]
    }
};

// Add ICE server configuration for better connectivity
const iceConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
};

// Add connection options for peer connections
const peerConnectionOptions = {
    optional: [
        { DtlsSrtpKeyAgreement: true },
        { RtpDataChannels: true }
    ]
};

let localStream = null;
let screenStream = null;  // Add screen stream variable
const peers = new Map();
let videoGrid;

export const getLocalStream = () => localStream;
export const getScreenStream = () => screenStream;  // Add getter for screen stream

export const localPreviewInitConnection = async (isRoomHost, identity, roomId = null) => {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Optimize video encoding
            localStream.getVideoTracks().forEach(track => {
                const capabilities = track.getCapabilities();
                if (capabilities.bitrate) {
                    track.applyConstraints({
                        ...constraints.video,
                        bitrate: 500000  // 500kbps for better performance
                    }).catch(console.error);
                }
            });

            // Optimize audio encoding
            localStream.getAudioTracks().forEach(track => {
                track.applyConstraints({
                    ...constraints.audio,
                    echoCancellation: true,
                    noiseSuppression: true
                }).catch(console.error);
            });
        }
        
        store.dispatch(setShowOverlay(false));

        setupVideoGrid();
        const localVideo = createVideo(localStream, true);
        addVideoStream(localVideo, localStream);

        // Monitor track status
        localStream.getTracks().forEach(track => {
            track.addEventListener('ended', () => {
                console.log(`Local ${track.kind} track ended`);
                refreshLocalStream();
            });

            track.addEventListener('mute', () => {
                console.log(`Local ${track.kind} track muted`);
            });

            track.addEventListener('unmute', () => {
                console.log(`Local ${track.kind} track unmuted`);
            });
        });

        isRoomHost ? wss.createNewRoom(identity) : wss.joinRoom(roomId, identity);
        return localStream;
    } catch (err) {
        console.error("Error accessing media devices:", err);
        store.dispatch(setShowOverlay(true));
        throw err;
    }
};

const refreshLocalStream = async () => {
    try {
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream = newStream;
        
        // Update local video
        const localVideo = document.querySelector('video[data-local="true"]');
        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        // Update all peer connections with new stream
        wss.updatePeerConnections(localStream);
    } catch (err) {
        console.error('Error refreshing local stream:', err);
    }
};

const createVideo = (stream, isLocal, isScreen = false) => {
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = isScreen ? 'contain' : 'cover';
    video.style.borderRadius = '12px';
    video.style.transform = isLocal ? 'scaleX(-1)' : 'none';
    
    // Only set background color if there are video tracks
    if (stream.getVideoTracks().length > 0) {
        video.style.backgroundColor = '#000';
    }
    
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    if (isLocal) {
        video.muted = true;
        video.setAttribute('data-local', 'true');
    }
    if (isScreen) {
        video.setAttribute('data-screen', 'true');
    }

    return video;
};

const setupVideoGrid = () => {
    // Create main container if it doesn't exist
    const mainContainer = document.getElementById('video-grid-container') || document.createElement('div');
    mainContainer.id = 'video-grid-container';
    mainContainer.style.display = 'flex';
    mainContainer.style.flexDirection = 'column';
    mainContainer.style.gap = '16px';
    mainContainer.style.height = '100%';
    mainContainer.style.width = '100%';
    mainContainer.style.padding = '16px';

    // Create screen share container with initial hidden state
    const screenShareContainer = document.createElement('div');
    screenShareContainer.id = 'screen-share-container';
    screenShareContainer.style.flex = '1';
    screenShareContainer.style.minHeight = '60%';
    screenShareContainer.style.backgroundColor = '#1a1a1a';
    screenShareContainer.style.borderRadius = '12px';
    screenShareContainer.style.display = 'none';  // Initially hidden
    screenShareContainer.style.justifyContent = 'center';
    screenShareContainer.style.alignItems = 'center';
    screenShareContainer.style.overflow = 'hidden';

    // Create camera feeds grid
    const cameraGrid = document.createElement('div');
    cameraGrid.id = 'video-grid';
    cameraGrid.style.display = 'grid';
    cameraGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    cameraGrid.style.gap = '8px';
    cameraGrid.style.flex = '1';  // Changed from '0 0 35%' to '1'
    cameraGrid.style.minHeight = '200px';

    // Clear and set up the structure
    mainContainer.innerHTML = '';
    mainContainer.appendChild(screenShareContainer);
    mainContainer.appendChild(cameraGrid);

    // Replace the old video grid with the new structure
    const oldContainer = document.getElementById('video-grid');
    if (oldContainer && oldContainer.parentNode) {
        oldContainer.parentNode.replaceChild(mainContainer, oldContainer);
    } else {
        document.querySelector('.room-container').appendChild(mainContainer);
    }

    videoGrid = cameraGrid;
};

const addVideoStream = (video, stream) => {
    if (!videoGrid) {
        setupVideoGrid();
    }

    const isScreenShare = video.hasAttribute('data-screen');
    const hasVideoTrack = stream.getVideoTracks().length > 0;
    const container = isScreenShare ? 
        document.getElementById('screen-share-container') : 
        document.getElementById('video-grid');

    if (!container) return;

    // Only create video wrapper if there's a video track or it's a screen share
    if (hasVideoTrack || isScreenShare) {
        const videoWrapper = document.createElement('div');
        videoWrapper.style.position = 'relative';
        videoWrapper.style.width = '100%';
        videoWrapper.style.height = '100%';
        videoWrapper.style.borderRadius = '12px';
        videoWrapper.style.overflow = 'hidden';

        if (isScreenShare) {
            videoWrapper.style.width = '100%';
            videoWrapper.style.height = '100%';
            video.style.objectFit = 'contain';
            // Show screen share container and clear previous content
            container.style.display = 'flex';
            container.innerHTML = '';
        } else {
            videoWrapper.style.aspectRatio = '16/9';
            video.style.objectFit = 'cover';
            // Only set background color if there are video tracks
            if (hasVideoTrack) {
                videoWrapper.style.backgroundColor = '#000';
            }
        }

        // Add stream type indicator
        const streamType = isScreenShare ? 'Screen Share' : (hasVideoTrack ? 'Camera' : 'Audio Only');
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute';
        indicator.style.top = '8px';
        indicator.style.left = '8px';
        indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        indicator.style.color = 'white';
        indicator.style.padding = '4px 8px';
        indicator.style.borderRadius = '4px';
        indicator.style.fontSize = '12px';
        indicator.textContent = streamType;

        videoWrapper.appendChild(video);
        videoWrapper.appendChild(indicator);

        video.addEventListener('loadedmetadata', () => {
            video.play().catch(err => {
                console.error('Error playing video:', err);
                setTimeout(() => video.play().catch(console.error), 1000);
            });
        });

        container.appendChild(videoWrapper);
        updateGridLayout();
    }
};

const updateGridLayout = () => {
    const cameraGrid = document.getElementById('video-grid');
    if (!cameraGrid) return;

    // Update camera grid layout
    const cameras = Array.from(cameraGrid.children);
    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(cameras.length))));
    
    cameraGrid.style.display = 'grid';
    cameraGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    cameraGrid.style.gap = '8px';
    
    // Update all video containers
    cameras.forEach(container => {
        container.style.aspectRatio = '16/9';
        container.style.backgroundColor = '#000';
        container.style.borderRadius = '12px';
        container.style.overflow = 'hidden';
        
        const video = container.querySelector('video');
        if (video) {
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
        }
    });
};

export const handleRemoteStream = (stream, peerId, isScreenShare = false) => {
    console.log('Handling remote stream for peer:', peerId, stream.getTracks());
    
    try {
        // Check if stream has video tracks
        const hasVideoTrack = stream.getVideoTracks().length > 0;
        
        // Only create video container if there's a video track or it's a screen share
        if (hasVideoTrack || isScreenShare) {
            // Create and add new video element
            if (isScreenShare) {
                // Create container for screen share
                const screenContainer = document.createElement('div');
                screenContainer.className = 'screen-share-container';
                screenContainer.setAttribute('data-peer', peerId);
                screenContainer.style.position = 'absolute';
                screenContainer.style.top = '16px';
                screenContainer.style.right = '16px';
                screenContainer.style.width = '25%';
                screenContainer.style.minWidth = '320px';
                screenContainer.style.height = 'auto';
                screenContainer.style.zIndex = '1000';
                screenContainer.style.borderRadius = '12px';
                screenContainer.style.overflow = 'hidden';
                screenContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                screenContainer.style.backgroundColor = '#000';

                const screenVideo = createVideo(stream, false, true);
                screenVideo.style.width = '100%';
                screenVideo.style.height = 'auto';
                screenContainer.appendChild(screenVideo);

                // Add the screen container to the video grid parent
                const videoGrid = document.getElementById('video-grid');
                if (videoGrid && videoGrid.parentNode) {
                    videoGrid.parentNode.appendChild(screenContainer);
                }
            } else {
                // Handle regular video stream
                const remoteVideo = createVideo(stream, false);
                addVideoStream(remoteVideo, stream);
            }
        }

        // Store peer information
        peers.set(peerId, {
            stream,
            isScreenShare,
            hasVideo: hasVideoTrack
        });

        // Monitor remote stream tracks
        stream.getTracks().forEach(track => {
            console.log(`Remote ${track.kind} track added for peer:`, peerId);
            track.onended = () => {
                console.log(`Remote ${track.kind} track ended for peer:`, peerId);
                if (isScreenShare) {
                    const screenContainer = document.querySelector(`.screen-share-container[data-peer="${peerId}"]`);
                    if (screenContainer) {
                        screenContainer.remove();
                    }
                }
            };
        });
    } catch (err) {
        console.error('Error handling remote stream:', err);
    }
};

export const removeRemoteStream = (peerId) => {
    const peer = peers.get(peerId);
    if (peer) {
        console.log('Removing remote stream for peer:', peerId);
        if (peer.video && peer.video.parentNode) {
            peer.video.parentNode.remove();
        }
        if (peer.stream) {
            peer.stream.getTracks().forEach(track => track.stop());
        }
        peers.delete(peerId);
        updateGridLayout();
    }
};

export const stopLocalStream = () => {
    console.log('Stopping all streams...');
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    peers.forEach((peer, userId) => {
        removeRemoteStream(userId);
    });
    peers.clear();

    const videoGrid = document.getElementById('video-grid');
    if (videoGrid) {
        videoGrid.innerHTML = '';
    }
};

export const startScreenSharing = async () => {
    try {
        if (screenStream) {
            await stopScreenSharing();
        }

        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            }
        });

        // Set content hint for screen sharing
        screenStream.getVideoTracks().forEach(track => {
            track.contentHint = 'screen';
        });

        // Create video element for local preview
        const screenVideo = createVideo(screenStream, false, true);
        addVideoStream(screenVideo, screenStream);

        // Handle screen sharing stop from browser
        screenStream.getVideoTracks()[0].onended = () => {
            stopScreenSharing();
        };

        // Add screen tracks to all peer connections
        const peerConnections = wss.getPeerConnections();
        const screenTrack = screenStream.getVideoTracks()[0];
        
        Object.entries(peerConnections).forEach(([userId, peerConnection]) => {
            console.log('Adding screen track to peer:', userId);
            try {
                // Create a new stream for screen sharing
                const screenOnlyStream = new MediaStream([screenTrack]);
                const sender = peerConnection.addTrack(screenTrack, screenOnlyStream);
                
                if (sender) {
                    const params = sender.getParameters();
                    if (!params.encodings) {
                        params.encodings = [{}];
                    }
                    params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps for screen sharing
                    params.encodings[0].maxFramerate = 30;
                    sender.setParameters(params).catch(console.error);
                }

                // Renegotiate connection after adding screen track
                peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                })
                    .then(offer => peerConnection.setLocalDescription(offer))
                    .then(() => {
                        wss.socket.emit('offer', {
                            target: userId,
                            offer: peerConnection.localDescription,
                            isScreenShare: true
                        });
                    })
                    .catch(console.error);
            } catch (err) {
                console.error('Error adding screen track to peer:', err);
            }
        });

        return true;
    } catch (err) {
        console.error('Error starting screen share:', err);
        return false;
    }
};

export const stopScreenSharing = async () => {
    if (screenStream) {
        // Stop all tracks
        screenStream.getTracks().forEach(track => {
            track.stop();
        });
        
        // Remove screen sharing container and hide it
        const screenContainer = document.getElementById('screen-share-container');
        if (screenContainer) {
            screenContainer.innerHTML = '';
            screenContainer.style.display = 'none';
        }

        // Remove screen tracks from peer connections
        const peerConnections = wss.getPeerConnections();
        Object.entries(peerConnections).forEach(([userId, peerConnection]) => {
            const senders = peerConnection.getSenders();
            const screenSenders = senders.filter(sender => 
                sender.track && sender.track.contentHint === 'screen'
            );

            screenSenders.forEach(sender => {
                peerConnection.removeTrack(sender);
            });

            // Renegotiate connection after removing screen track
            peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            })
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    wss.socket.emit('offer', {
                        target: userId,
                        offer: peerConnection.localDescription
                    });
                })
                .catch(console.error);
        });

        screenStream = null;
        return true;
    }
    return false;
};
