import { setShowOverlay } from "../../redux/slices/app";
import { store } from "../../redux/store";
import * as wss from "./wss";

const constraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    },
    video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        frameRate: { min: 15, ideal: 30, max: 30 }
    }
};

let localStream = null;
const peers = new Map();
let videoGrid;

export const getLocalStream = () => localStream;

export const localPreviewInitConnection = async (isRoomHost, identity, roomId = null) => {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log("Local Stream Received", localStream.getTracks());
            
            // Set bitrates for video track
            localStream.getVideoTracks().forEach(track => {
                const capabilities = track.getCapabilities();
                if (capabilities.bitrate) {
                    track.applyConstraints({
                        ...constraints.video,
                        bitrate: 1000000 // 1 Mbps
                    }).catch(console.error);
                }
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