import { setShowOverlay } from "../../redux/slices/app";
import { store } from "../../redux/store";
import * as wss from "./wss";

const constraints = {
    audio: true,
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.7777777778 }
    }
};

let localstream;
const peers = {};
let videoGrid;

export const localPreviewInitConnection = async (isRoomHost, identity, roomId=null) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Local Stream Received");
        store.dispatch(setShowOverlay(false));
        localstream = stream;
        setupVideoGrid();
        addVideoStream(createVideo(localstream, true), localstream);
        isRoomHost ? wss.createNewRoom(identity) : wss.joinRoom(roomId, identity);
    } catch (err) {
        console.log("Error accessing media devices:", err);
        store.dispatch(setShowOverlay(true));
    }
};

export const stopLocalStream = () => {
    if (localstream) {
        localstream.getTracks().forEach(track => track.stop());
    }
    Object.values(peers).forEach(peer => {
        if (peer.video) {
            peer.video.remove();
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

    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => console.log('Error playing video:', err));
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
        video: remoteVideo
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