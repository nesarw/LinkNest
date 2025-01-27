import { setShowOverlay } from "../../redux/slices/app";
import { store } from "../../redux/store";
import * as wss from "./wss";

const constraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1, // Mono audio for better performance
        latency: 0.01 // Low latency audio
    },
    video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        aspectRatio: 1.7777777778,
        frameRate: { min: 24, ideal: 30, max: 60 }
    }
};

let localstream = null;
let mediaStream = null;
const peers = {};
let videoGrid;
let streamCheckInterval;
let streamRetryTimeout;
const MAX_RETRY_ATTEMPTS = 3;
let retryCount = 0;

// Initialize media stream once and reuse
const initializeMediaStream = async () => {
    if (mediaStream) return mediaStream;
    
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        return mediaStream;
    } catch (err) {
        console.error('Error initializing media stream:', err);
        throw err;
    }
};

const startStreamMonitoring = () => {
    if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
    }

    streamCheckInterval = setInterval(async () => {
        if (!localstream) return;

        const tracks = localstream.getTracks();
        const hasInactiveTrack = tracks.some(track => !track.enabled || track.readyState === 'ended');

        if (hasInactiveTrack && retryCount < MAX_RETRY_ATTEMPTS) {
            retryCount++;
            console.log(`Attempting stream recovery (${retryCount}/${MAX_RETRY_ATTEMPTS})...`);
            
            try {
                // Reuse existing mediaStream if possible
                const stream = mediaStream || await initializeMediaStream();
                
                // Update tracks without recreating the stream
                tracks.forEach(track => {
                    const newTrack = stream.getTracks().find(t => t.kind === track.kind);
                    if (newTrack) {
                        track.enabled = true;
                        // Update track in peer connections
                        Object.values(peers).forEach(peer => {
                            if (peer.connection) {
                                const sender = peer.connection.getSenders().find(s => s.track.kind === track.kind);
                                if (sender) sender.replaceTrack(newTrack.clone());
                            }
                        });
                    }
                });

                // Update local video without recreating element
                const localVideo = document.querySelector('video[data-local="true"]');
                if (localVideo) {
                    localVideo.srcObject = stream;
                    await localVideo.play();
                }

                retryCount = 0; // Reset counter on success
            } catch (err) {
                console.error('Stream recovery failed:', err);
                if (retryCount === MAX_RETRY_ATTEMPTS) {
                    console.log('Max retry attempts reached, will try again in 5 seconds');
                    clearInterval(streamCheckInterval);
                    streamRetryTimeout = setTimeout(startStreamMonitoring, 5000);
                }
            }
        }
    }, 1000); // Check every second for faster recovery
};

export const localPreviewInitConnection = async (isRoomHost, identity, roomId=null) => {
    try {
        // Initialize or reuse media stream
        localstream = await initializeMediaStream();
        console.log("Local Stream Received");
        store.dispatch(setShowOverlay(false));

        // Set up track ended handlers
        localstream.getTracks().forEach(track => {
            track.addEventListener('ended', async () => {
                console.log(`${track.kind} track ended, attempting immediate recovery...`);
                try {
                    const newStream = await initializeMediaStream();
                    const newTrack = newStream.getTracks().find(t => t.kind === track.kind);
                    if (newTrack) {
                        localstream.addTrack(newTrack);
                        updatePeerConnections(newTrack);
                    }
                } catch (err) {
                    console.error(`Error recovering ${track.kind} track:`, err);
                }
            });
        });

        setupVideoGrid();
        addVideoStream(createVideo(localstream, true), localstream);
        startStreamMonitoring();

        isRoomHost ? wss.createNewRoom(identity) : wss.joinRoom(roomId, identity);

        // Handle device changes
        navigator.mediaDevices.addEventListener('devicechange', async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasVideoInput = devices.some(device => device.kind === 'videoinput');
                const hasAudioInput = devices.some(device => device.kind === 'audioinput');

                if (hasVideoInput && hasAudioInput) {
                    const newStream = await initializeMediaStream();
                    updateLocalStream(newStream);
                }
            } catch (err) {
                console.error('Error handling device change:', err);
            }
        });

    } catch (err) {
        console.error("Error accessing media devices:", err);
        store.dispatch(setShowOverlay(true));
    }
};

const updatePeerConnections = (newTrack) => {
    Object.values(peers).forEach(peer => {
        if (peer.connection) {
            const sender = peer.connection.getSenders().find(s => s.track.kind === newTrack.kind);
            if (sender) {
                sender.replaceTrack(newTrack.clone());
            }
        }
    });
};

const updateLocalStream = (newStream) => {
    if (!localstream) return;

    // Update tracks without stopping the stream
    localstream.getTracks().forEach(track => {
        const newTrack = newStream.getTracks().find(t => t.kind === track.kind);
        if (newTrack) {
            track.enabled = false; // Disable old track
            localstream.removeTrack(track);
            localstream.addTrack(newTrack);
            updatePeerConnections(newTrack);
        }
    });

    // Update local video
    const localVideo = document.querySelector('video[data-local="true"]');
    if (localVideo) {
        localVideo.srcObject = localstream;
    }
};

export const stopLocalStream = () => {
    if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
    }
    if (streamRetryTimeout) {
        clearTimeout(streamRetryTimeout);
    }

    if (localstream) {
        localstream.getTracks().forEach(track => track.stop());
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    Object.values(peers).forEach(peer => {
        if (peer.video) {
            peer.video.remove();
        }
        if (peer.stream) {
            peer.stream.getTracks().forEach(track => track.stop());
        }
        if (peer.connection) {
            peer.connection.close();
        }
    });

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

const createVideo = (stream, isLocal = false) => {
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.borderRadius = '12px';
    video.style.transform = 'scaleX(-1)'; // Mirror effect
    video.style.backgroundColor = '#000';
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true; // Better mobile support
    
    if (isLocal) {
        video.muted = true;
        video.setAttribute('data-local', 'true');
    }

    // Handle video playback errors
    video.onerror = async () => {
        console.log('Video playback error, attempting to recover...');
        try {
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = newStream;
            await video.play();
        } catch (err) {
            console.error('Error recovering video playback:', err);
        }
    };

    return video;
};

const addVideoStream = (video, stream) => {
    if (!videoGrid) {
        videoGrid = document.getElementById('video-grid');
    }
    if (!videoGrid) return;

    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => {
            console.log('Error playing video:', err);
            // Retry playback with a delay
            setTimeout(() => video.play().catch(e => console.error('Retry failed:', e)), 1000);
        });
    });

    const videoWrapper = document.createElement('div');
    videoWrapper.style.position = 'relative';
    videoWrapper.style.width = '100%';
    videoWrapper.style.height = '100%';
    videoWrapper.style.minHeight = '200px';
    videoWrapper.appendChild(video);

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
    const remoteVideo = createVideo(stream);
    addVideoStream(remoteVideo, stream);
    peers[peerId] = {
        stream,
        video: remoteVideo,
        connection: null
    };
};

export const removeRemoteStream = (peerId) => {
    if (peers[peerId]) {
        const videoElement = peers[peerId].video;
        if (videoElement && videoElement.parentNode) {
            videoElement.parentNode.remove();
        }
        if (peers[peerId].stream) {
            peers[peerId].stream.getTracks().forEach(track => track.stop());
        }
        delete peers[peerId];
        updateGridLayout();
    }
};