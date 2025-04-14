import { setShowOverlay } from "../../redux/slices/app";
import { store } from "../../redux/store";
import * as wss from "./wss";

const constraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleSize: 16
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
            
            // Ensure audio tracks are enabled
            localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
                console.log('Local audio track enabled:', track.label);
            });

            // Optimize video encoding
            localStream.getVideoTracks().forEach(track => {
                const capabilities = track.getCapabilities();
                if (capabilities.bitrate) {
                    track.applyConstraints({
                        ...constraints.video,
                        bitrate: 500000
                    }).catch(console.error);
                }
            });
        }
        
        store.dispatch(setShowOverlay(false));

        setupVideoGrid();
        const localVideo = createVideo(localStream, true);
        addVideoStream(localVideo, localStream, identity);

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
    console.log('Creating video element:', {
        isLocal,
        isScreen,
        hasVideoTracks: stream.getVideoTracks().length > 0
    });
    
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = isScreen ? 'contain' : 'cover';
    video.style.borderRadius = '12px';
    // Only apply mirroring for local camera feeds, not for screen shares
    video.style.transform = (isLocal && !isScreen) ? 'scaleX(-1)' : 'none';
    
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

    console.log('Video element attributes:', {
        hasDataLocal: video.hasAttribute('data-local'),
        hasDataScreen: video.hasAttribute('data-screen')
    });

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
    screenShareContainer.style.flex = '0 0 auto';
    screenShareContainer.style.height = '350px'; // Reduced height
    screenShareContainer.style.backgroundColor = '#1a1a1a';
    screenShareContainer.style.borderRadius = '12px';
    screenShareContainer.style.display = 'none';
    screenShareContainer.style.justifyContent = 'center';
    screenShareContainer.style.alignItems = 'center';
    screenShareContainer.style.overflow = 'hidden';
    screenShareContainer.style.width = '65%';
    screenShareContainer.style.margin = '0 auto';

    // Create camera feeds grid
    const cameraGrid = document.createElement('div');
    cameraGrid.id = 'video-grid';
    cameraGrid.style.display = 'grid';
    cameraGrid.style.gap = '16px';
    cameraGrid.style.flex = '0 0 auto'; // Don't allow flex growth
    cameraGrid.style.height = '200px'; // Fixed height for single user
    cameraGrid.style.width = '65%';
    cameraGrid.style.margin = '0 auto';
    cameraGrid.style.alignItems = 'center';
    cameraGrid.style.justifyContent = 'center';

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

const createFullscreenButton = (container) => {
    const button = document.createElement('button');
    button.innerHTML = '⛶'; // Unicode fullscreen icon
    button.style.position = 'absolute';
    button.style.bottom = '8px';
    button.style.right = '8px';
    button.style.zIndex = '10';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.padding = '4px 8px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '16px';
    
    return button;
};

const handleFullscreenToggle = (container) => {
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
};

const addVideoStream = (video, stream, identity = null) => {
    if (!videoGrid) {
        setupVideoGrid();
    }

    const isScreenShare = video.hasAttribute('data-screen');
    const hasVideoTrack = stream.getVideoTracks().length > 0;
    const container = isScreenShare ? 
        document.getElementById('screen-share-container') : 
        document.getElementById('video-grid');

    console.log('Adding video stream:', {
        isScreenShare,
        hasVideoTrack,
        identity,
        isLocal: video.hasAttribute('data-local'),
        containerId: container?.id
    });

    if (!container) return;

    // Only create video wrapper if there's a video track or it's a screen share
    if (hasVideoTrack || isScreenShare) {
        const videoWrapper = document.createElement('div');
        videoWrapper.style.position = 'relative';
        videoWrapper.style.width = '100%';
        videoWrapper.style.borderRadius = '12px';
        videoWrapper.style.overflow = 'hidden';

        if (isScreenShare) {
            videoWrapper.style.height = '100%';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            video.style.backgroundColor = 'transparent';
            // Show screen share container and clear previous content
            container.style.display = 'flex';
            container.style.backgroundColor = '#1a1a1a';
            container.innerHTML = '';
        } else {
            videoWrapper.style.height = '0';
            videoWrapper.style.paddingBottom = '56.25%'; // 16:9 aspect ratio
            videoWrapper.style.backgroundColor = '#000';
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
        }

        // Add user identity indicator
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute';
        indicator.style.top = '8px';
        indicator.style.left = '8px';
        indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        indicator.style.color = 'white';
        indicator.style.padding = '4px 8px';
        indicator.style.borderRadius = '4px';
        indicator.style.fontSize = '12px';
        
        if (isScreenShare) {
            // For screen share, show both sharing and receiving labels
            const isLocal = video.hasAttribute('data-local');
            console.log('Screen share label creation:', {
                isLocal,
                identity,
                containerId: container.id
            });
            
            if (isLocal) {
                indicator.textContent = `${identity} (Sharing Screen)`;
            } else {
                indicator.textContent = `${identity} (Shared Screen)`;
                // Add receiving label
                const receivingLabel = document.createElement('div');
                receivingLabel.style.position = 'absolute';
                receivingLabel.style.top = '8px';
                receivingLabel.style.right = '8px';
                receivingLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                receivingLabel.style.color = 'white';
                receivingLabel.style.padding = '4px 8px';
                receivingLabel.style.borderRadius = '4px';
                receivingLabel.style.fontSize = '12px';
                receivingLabel.textContent = 'Receiving Screen Share';
                videoWrapper.appendChild(receivingLabel);
            }
        } else {
            indicator.textContent = identity || 'Anonymous';
        }

        // Add fullscreen button
        const fullscreenButton = createFullscreenButton(videoWrapper);
        fullscreenButton.onclick = () => handleFullscreenToggle(videoWrapper);

        videoWrapper.appendChild(video);
        videoWrapper.appendChild(indicator);
        videoWrapper.appendChild(fullscreenButton);

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
    const screenShareContainer = document.getElementById('screen-share-container');
    if (!cameraGrid) return;

    // Update camera grid layout
    const cameras = Array.from(cameraGrid.children);
    const columns = cameras.length === 1 ? 1 : 2;
    const isScreenSharing = screenShareContainer && screenShareContainer.style.display !== 'none';
    
    cameraGrid.style.display = 'grid';
    cameraGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    cameraGrid.style.gap = '16px';
    cameraGrid.style.maxWidth = '100%';
    cameraGrid.style.margin = '0 auto';
    
    // Adjust height based on number of users and screen sharing state
    if (cameras.length === 1 && isScreenSharing) {
        cameraGrid.style.height = '200px'; // Fixed height for single user with screen share
        cameraGrid.style.flex = '0 0 auto';
    } else {
        cameraGrid.style.height = 'auto';
        cameraGrid.style.flex = '1';
    }
    
    // Update all video containers
    cameras.forEach(container => {
        container.style.backgroundColor = '#000';
        container.style.borderRadius = '12px';
        container.style.overflow = 'hidden';
        container.style.width = '100%';
        container.style.position = 'relative';
        container.style.paddingBottom = '56.25%'; // 16:9 aspect ratio
        
        const video = container.querySelector('video');
        if (video) {
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
        }
    });
};

export const handleRemoteStream = (stream, peerId, isScreenShare = false) => {
    console.log('Handling remote stream for peer:', peerId, {
        tracks: stream.getTracks().map(t => ({ kind: t.kind, label: t.label, contentHint: t.contentHint })),
        isScreenShare
    });
    
    try {
        // Check if stream has video tracks
        const hasVideoTrack = stream.getVideoTracks().length > 0;
        
        // Get video track for analysis
        const videoTrack = stream.getVideoTracks()[0];
        
        // Get peer connection to check if this is from a screen share offer
        const peerConnection = wss.getPeerConnections()[peerId];
        const isFromScreenShareOffer = peerConnection?.isScreenShareOffer || false;
        
        // Enhanced screen share detection - use the same logic for all users
        const isScreenStream = isScreenShare || isFromScreenShareOffer || (videoTrack && (() => {
            const label = videoTrack.label.toLowerCase();
            const contentHint = videoTrack.contentHint?.toLowerCase() || '';
            
            // Log detailed track information for debugging
            console.log('Analyzing video track:', {
                peerId,
                label,
                contentHint,
                isScreenShare,
                isFromScreenShareOffer
            });
            
            // Primary check: explicit flags
            if (isScreenShare || isFromScreenShareOffer) {
                console.log('Screen share identified by explicit flag');
                return true;
            }
            
            // Secondary check: content hint
            if (contentHint === 'screen') {
                console.log('Screen share identified by content hint');
                return true;
            }
            
            return false;
        })());

        // Ensure screen sharing tracks are properly marked
        if (isScreenStream) {
            console.log('Marking stream as screen share for peer:', peerId);
            stream.getTracks().forEach(track => {
                track.enabled = true;
                if (track.kind === 'video') {
                    track.contentHint = 'screen';
                    
                    // Add a custom property to identify screen tracks
                    track.isScreenTrack = true;
                    
                    // Completely disable mute/unmute handlers for screen tracks
                    track.onmute = null;
                    track.onunmute = null;
                    
                    console.log(`Screen track configured for peer: ${peerId}, disabled mute/unmute handlers`);
                }
            });
        } else {
            // For non-screen tracks, ensure they're properly configured
            stream.getTracks().forEach(track => {
                if (track.kind === 'video') {
                    // Mark as non-screen track
                    track.isScreenTrack = false;
                    
                    // Ensure track is enabled
                    track.enabled = true;
                }
            });
        }
        
        // Create video elements based on stream type
        if (hasVideoTrack) {
            if (isScreenStream) {
                // Handle screen share stream
                console.log('Creating screen share container for peer:', peerId);
                const screenContainer = document.createElement('div');
                screenContainer.className = 'screen-share-container';
                screenContainer.setAttribute('data-peer', peerId);
                screenContainer.setAttribute('data-type', 'screen');
                screenContainer.style.width = '100%';
                screenContainer.style.height = '100%';
                screenContainer.style.position = 'relative';
                screenContainer.style.borderRadius = '12px';
                screenContainer.style.overflow = 'hidden';
                screenContainer.style.backgroundColor = '#000';
                screenContainer.style.display = 'flex';
                screenContainer.style.alignItems = 'center';
                screenContainer.style.justifyContent = 'center';

                const screenVideo = createVideo(stream, false, true);
                screenVideo.setAttribute('data-peer', peerId);
                screenVideo.setAttribute('data-type', 'screen');
                screenVideo.style.width = 'auto';
                screenVideo.style.height = '100%';
                screenVideo.style.maxWidth = '100%';
                screenVideo.style.objectFit = 'contain';
                screenContainer.appendChild(screenVideo);

                // Add to screen share container
                const screenShareContainer = document.getElementById('screen-share-container');
                if (screenShareContainer) {
                    const peerIdentity = peerConnection?.identity || 'Anonymous';
                    
                    console.log('Adding screen share to container for peer:', peerId, peerIdentity);
                    
                    screenShareContainer.style.display = 'flex';
                    screenShareContainer.innerHTML = '';
                    screenShareContainer.appendChild(screenContainer);
                    
                    // Add identity label
                    const identityLabel = document.createElement('div');
                    identityLabel.style.position = 'absolute';
                    identityLabel.style.top = '8px';
                    identityLabel.style.left = '8px';
                    identityLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                    identityLabel.style.color = 'white';
                    identityLabel.style.padding = '4px 8px';
                    identityLabel.style.borderRadius = '4px';
                    identityLabel.style.fontSize = '12px';
                    identityLabel.textContent = `${peerIdentity}'s Screen Share`;
                    screenContainer.appendChild(identityLabel);

                    // Add receiving label
                    const receivingLabel = document.createElement('div');
                    receivingLabel.style.position = 'absolute';
                    receivingLabel.style.top = '8px';
                    receivingLabel.style.right = '8px';
                    receivingLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                    receivingLabel.style.color = 'white';
                    receivingLabel.style.padding = '4px 8px';
                    receivingLabel.style.borderRadius = '4px';
                    receivingLabel.style.fontSize = '12px';
                    receivingLabel.textContent = 'Receiving Screen Share';
                    screenContainer.appendChild(receivingLabel);
                }
            } else {
                // Handle camera video stream
                console.log('Creating camera video element for peer:', peerId);
                const remoteVideo = createVideo(stream, false);
                remoteVideo.setAttribute('data-peer', peerId);
                remoteVideo.setAttribute('data-type', 'camera');
                const peerIdentity = peerConnection?.identity || 'Anonymous';
                addVideoStream(remoteVideo, stream, peerIdentity);
            }
        }

        // Store peer information
        peers.set(peerId, {
            stream,
            isScreenShare: isScreenStream,
            hasVideo: hasVideoTrack,
            identity: peerConnection?.identity || 'Anonymous'
        });

        // Monitor track status
        stream.getTracks().forEach(track => {
            track.onended = () => {
                console.log(`Remote ${track.kind} track ended for peer:`, peerId);
                if (isScreenStream) {
                    console.log(`Screen share track ended for peer: ${peerId}, cleaning up UI`);
                    
                    // Remove screen container
                    const screenContainer = document.querySelector(`.screen-share-container[data-peer="${peerId}"]`);
                    if (screenContainer) {
                        screenContainer.remove();
                    }
                    
                    // Hide screen share container if empty
                    const screenShareContainer = document.getElementById('screen-share-container');
                    if (screenShareContainer) {
                        screenShareContainer.style.display = 'none';
                        screenShareContainer.innerHTML = '';
                    }
                    
                    // Update peer information
                    const peer = peers.get(peerId);
                    if (peer) {
                        peer.isScreenShare = false;
                        peers.set(peerId, peer);
                    }
                    
                    // Update layout
                    updateGridLayout();
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
        
        // Stop all tracks from the peer's stream
        if (peer.stream) {
            peer.stream.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopped ${track.kind} track for peer:`, peerId);
            });
        }
        
        // Find and remove all video elements in the video grid
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            // Find all video wrappers for this peer
            const videoWrappers = videoGrid.querySelectorAll('div');
            videoWrappers.forEach(wrapper => {
                const video = wrapper.querySelector('video');
                if (video) {
                    // Check if this video belongs to the peer being removed
                    if (video.dataset.peer === peerId || 
                        (video.srcObject && video.srcObject === peer.stream)) {
                        console.log('Found and removing video element for peer:', peerId);
                        // Stop all tracks in the video's stream
                        if (video.srcObject) {
                            video.srcObject.getTracks().forEach(track => {
                                track.stop();
                                console.log(`Stopped track in video element for peer:`, peerId);
                            });
                            video.srcObject = null;
                        }
                        wrapper.remove();
                    }
                }
            });
        }
        
        // Clean up screen share elements
        const screenContainer = document.querySelector(`.screen-share-container[data-peer="${peerId}"]`);
        if (screenContainer) {
            console.log('Removing screen share container for peer:', peerId);
            // Stop any media streams in the screen container
            const screenVideo = screenContainer.querySelector('video');
            if (screenVideo && screenVideo.srcObject) {
                screenVideo.srcObject.getTracks().forEach(track => {
                    track.stop();
                    console.log(`Stopped screen share track for peer:`, peerId);
                });
                screenVideo.srcObject = null;
            }
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
        
        // Remove peer from peers map
        peers.delete(peerId);
        
        // Update grid layout
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

        // Request permission from server to start screen sharing
        return new Promise((resolve, reject) => {
            wss.socket.emit('request-screen-share');
            
            // Set up event listeners for the response
            const handleApproved = () => {
                wss.socket.off('screen-share-approved', handleApproved);
                wss.socket.off('screen-share-error', handleError);
                proceedWithScreenSharing().then(resolve).catch(reject);
            };
            
            const handleError = (data) => {
                wss.socket.off('screen-share-approved', handleApproved);
                wss.socket.off('screen-share-error', handleError);
                reject(new Error(data.message));
            };
            
            wss.socket.on('screen-share-approved', handleApproved);
            wss.socket.on('screen-share-error', handleError);
        });
    } catch (err) {
        console.error('Error starting screen share:', err);
        return false;
    }
};

// Helper function to proceed with screen sharing after server approval
const proceedWithScreenSharing = async () => {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            }
        });

        // Set content hint for screen sharing and ensure tracks are enabled
        screenStream.getVideoTracks().forEach(track => {
            track.contentHint = 'screen';
            track.enabled = true;
            
            // Add a custom property to identify screen tracks
            track.isScreenTrack = true;
            
            // Completely disable mute/unmute handlers for screen tracks
            track.onmute = null;
            track.onunmute = null;
            
            console.log(`Local screen track configured, disabled mute/unmute handlers`);
            
            // Set a higher priority for screen tracks to prevent interference
            if (track.getSettings) {
                const settings = track.getSettings();
                console.log('Screen track settings:', settings);
            }
        });

        // Create video element for local preview
        const screenVideo = createVideo(screenStream, true, true);
        const localVideo = document.querySelector('video[data-local="true"]');
        const localIdentity = localVideo?.parentElement?.querySelector('div')?.textContent || 'Anonymous';
        addVideoStream(screenVideo, screenStream, `${localIdentity}'s Screen Share`);

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
                    try {
                        const params = sender.getParameters();
                        // Only set encoding parameters if supported
                        if (params.encodings) {
                            if (params.encodings.length === 0) {
                                params.encodings.push({});
                            }
                            params.encodings[0].maxBitrate = 2500000;
                            params.encodings[0].maxFramerate = 30;
                            sender.setParameters(params).catch(err => {
                                console.warn('Could not set sender parameters:', err);
                            });
                        }
                    } catch (err) {
                        console.warn('Error setting sender parameters:', err);
                    }
                }

                // Renegotiate connection after adding screen track
                peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                })
                    .then(offer => {
                        // Mark this offer as a screen share
                        peerConnection.isScreenShareOffer = true;
                        return peerConnection.setLocalDescription(offer);
                    })
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
        console.error('Error proceeding with screen share:', err);
        return false;
    }
};

export const stopScreenSharing = async () => {
    if (screenStream) {
        console.log('Stopping screen sharing...');
        
        // Notify server that screen sharing has stopped
        wss.socket.emit('stop-screen-share');
        
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
                        offer: peerConnection.localDescription,
                        isScreenShare: false // Explicitly indicate screen sharing has stopped
                    });
                })
                .catch(console.error);
        });

        screenStream = null;
        return true;
    }
    return false;
};

export const getPeerInfo = (peerId) => {
    return peers.get(peerId);
};

export const updatePeerInfo = (peerId, peerInfo) => {
    peers.set(peerId, peerInfo);
};

export { updateGridLayout };
