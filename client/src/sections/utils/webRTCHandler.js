import { setShowOverlay } from "../../redux/slices/app";
import { store } from "../../redux/store";
import * as wss from "./wss";

const constraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
        latency: 0.01
    },
    video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        aspectRatio: 1.7777777778,
        frameRate: { min: 24, ideal: 30, max: 60 }
    }
};

let localStream = null;
const peers = new Map(); // Using Map for better key-value management
let videoGrid;

// Initialize stream with background fetch
const initializeStream = async () => {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            // Set up automatic quality monitoring
            localStream.getTracks().forEach(track => {
                track.addEventListener('ended', async () => {
                    await refreshStream(track.kind);
                });
            });
        }
        return localStream;
    } catch (err) {
        console.error('Error initializing stream:', err);
        throw err;
    }
};

// Refresh specific track type (audio/video)
const refreshStream = async (trackKind) => {
    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            [trackKind]: constraints[trackKind]
        });
        const newTrack = newStream.getTracks().find(t => t.kind === trackKind);
        
        if (newTrack && localStream) {
            const oldTrack = localStream.getTracks().find(t => t.kind === trackKind);
            if (oldTrack) {
                oldTrack.stop();
                localStream.removeTrack(oldTrack);
            }
            localStream.addTrack(newTrack);
            
            // Update all peer connections
            peers.forEach((peer, userId) => {
                if (peer.connection) {
                    const sender = peer.connection.getSenders().find(s => s.track?.kind === trackKind);
                    if (sender) {
                        sender.replaceTrack(newTrack.clone());
                    }
                }
            });

            // Update local video if it's video track
            if (trackKind === 'video') {
                const localVideo = document.querySelector('video[data-local="true"]');
                if (localVideo) {
                    localVideo.srcObject = localStream;
                }
            }
        }
    } catch (err) {
        console.error(`Error refreshing ${trackKind} track:`, err);
    }
};

export const localPreviewInitConnection = async (isRoomHost, identity, roomId = null) => {
    try {
        const stream = await initializeStream();
        console.log("Local Stream Received");
        store.dispatch(setShowOverlay(false));

        setupVideoGrid();
        addVideoStream(createVideo(stream, true), stream);

        // Monitor device changes
        navigator.mediaDevices.addEventListener('devicechange', async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideo = devices.some(d => d.kind === 'videoinput');
            const hasAudio = devices.some(d => d.kind === 'audioinput');
            
            if (hasVideo) await refreshStream('video');
            if (hasAudio) await refreshStream('audio');
        });

        isRoomHost ? wss.createNewRoom(identity) : wss.joinRoom(roomId, identity);
    } catch (err) {
        console.error("Error accessing media devices:", err);
        store.dispatch(setShowOverlay(true));
    }
};

const createVideo = (stream, isLocal = false) => {
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.borderRadius = '12px';
    video.style.transform = 'scaleX(-1)';
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
    // Remove existing peer if any
    removeRemoteStream(peerId);

    const remoteVideo = createVideo(stream);
    addVideoStream(remoteVideo, stream);
    
    peers.set(peerId, {
        stream,
        video: remoteVideo
    });
};

export const removeRemoteStream = (peerId) => {
    const peer = peers.get(peerId);
    if (peer) {
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