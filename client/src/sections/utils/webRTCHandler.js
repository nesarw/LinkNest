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
const peers = new Map();
let videoGrid;

export const getLocalStream = () => localStream;

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

const createVideo = (stream, isLocal = false) => {
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.borderRadius = '12px';
    video.style.transform = isLocal ? 'scaleX(-1)' : 'none';
    video.style.backgroundColor = '#000';
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    if (isLocal) {
        video.muted = true;
        video.setAttribute('data-local', 'true');
    }

    return video;
};

const addVideoStream = (video, stream) => {
    if (!videoGrid) {
        videoGrid = document.getElementById('video-grid');
    }
    if (!videoGrid) return;

    const videoWrapper = document.createElement('div');
    videoWrapper.style.position = 'relative';
    videoWrapper.style.width = '100%';
    videoWrapper.style.height = '100%';
    videoWrapper.style.minHeight = '200px';
    videoWrapper.appendChild(video);

    video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => {
            console.error('Error playing video:', err);
            setTimeout(() => video.play().catch(console.error), 1000);
        });
    });

    videoGrid.appendChild(videoWrapper);
    updateGridLayout();
};

const updateGridLayout = () => {
    if (!videoGrid) return;
    const participantCount = videoGrid.children.length;
    const columns = participantCount <= 2 ? 2 : Math.ceil(Math.sqrt(participantCount));
    videoGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
};

export const handleRemoteStream = (stream, peerId) => {
    console.log('Handling remote stream for peer:', peerId, stream.getTracks());
    
    // Remove existing peer stream if any
    removeRemoteStream(peerId);

    try {
        // Create and add new video element
        const remoteVideo = createVideo(stream, false);
        addVideoStream(remoteVideo, stream);

        // Store peer information
        peers.set(peerId, {
            stream,
            video: remoteVideo
        });

        // Monitor remote stream tracks
        stream.getTracks().forEach(track => {
            console.log(`Remote ${track.kind} track added for peer:`, peerId);
            track.onended = () => {
                console.log(`Remote ${track.kind} track ended for peer:`, peerId);
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

const setupVideoGrid = () => {
    videoGrid = document.getElementById('video-grid');
    if (!videoGrid) return;
    videoGrid.innerHTML = '';
};