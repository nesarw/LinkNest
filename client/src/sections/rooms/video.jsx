import React, { useEffect, useState } from "react";
import { Box, IconButton, Stack } from "@mui/material";
import { Microphone, MicrophoneSlash, VideoCamera, VideoCameraSlash, Chat, Monitor, MonitorPlay, Users, Info, PhoneDisconnect } from "phosphor-react";
import Participants from "./participants";
import Label from "./label";
import Chats from "./chat";
import { useNavigate } from "react-router-dom";
import * as wss from "../utils/wss";
import * as webRTCHandler from "../utils/webRTCHandler";
import { useSelector } from "react-redux";

const Video = () => {
  const navigate = useNavigate();
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenOn, setIsScreenOn] = useState(false);
  const [isParticipantsVisible, setIsParticipantsVisible] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(false);
  const [isChatsVisible, setIsChatsVisible] = useState(false);
  const [isMediaDisabledByHost, setIsMediaDisabledByHost] = useState(false);
  const isRoomHost = useSelector((state) => state.app.isRoomHost);
  const roomId = useSelector((state) => state.app.roomId);

  // Reset media disabled state when room changes
  useEffect(() => {
    setIsMediaDisabledByHost(false);
  }, [roomId]);

  useEffect(() => {
    const handleRoomClosed = () => {
      navigate('/');
    };

    wss.socket.on('room-closed', handleRoomClosed);

    // Add listener for host media control actions
    wss.socket.on('host-action', (data) => {
      const { action } = data;
      if (action === 'disable-all-media') {
        setIsMediaDisabledByHost(true);
        // Disable local media streams
        const localStream = webRTCHandler.getLocalStream();
        if (localStream && !isRoomHost) {
          localStream.getTracks().forEach(track => {
            track.enabled = false;
          });
        }
      } else if (action === 'enable-all-media') {
        setIsMediaDisabledByHost(false);
        // Enable local media streams
        const localStream = webRTCHandler.getLocalStream();
        if (localStream && !isRoomHost) {
          localStream.getTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }
    });

    return () => {
      wss.socket.off('room-closed', handleRoomClosed);
      wss.socket.off('host-action');
    };
  }, [navigate, isRoomHost]);

  const handleMicrophoneToggle = async () => {
    // If media is disabled by host and user is not host, do nothing
    if (isMediaDisabledByHost && !isRoomHost) {
      return;
    }

    const localStream = webRTCHandler.getLocalStream();
    if (localStream) {
      if (isMicrophoneOn) {
        // Stop the microphone
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;  // First disable the track
          audioTrack.stop();  // Then stop it
          localStream.removeTrack(audioTrack);
          
          // Update the stream without audio
          const localVideo = document.querySelector('video[data-local="true"]');
          if (localVideo) {
            const videoTracks = localStream.getVideoTracks();
            localVideo.srcObject = new MediaStream(videoTracks);
          }
        }
      } else {
        // Start the microphone
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              latency: 0.01,
              sampleSize: 16
            }
          });
          const newAudioTrack = newStream.getAudioTracks()[0];
          
          // Add the new audio track to the stream
          localStream.addTrack(newAudioTrack);
          
          // Update the video element with the new stream including audio
          const localVideo = document.querySelector('video[data-local="true"]');
          if (localVideo) {
            const newMediaStream = new MediaStream([
              newAudioTrack,
              ...localStream.getVideoTracks()
            ]);
            localVideo.srcObject = newMediaStream;
          }

          // Notify peers about the track change
          if (typeof wss.updatePeerConnections === 'function') {
            wss.updatePeerConnections(localStream);
          }
        } catch (err) {
          console.error("Error accessing microphone:", err);
          return;
        }
      }
      setIsMicrophoneOn(!isMicrophoneOn);
    }
  };

  useEffect(() => {
    // Initialize microphone state based on track status
    const localStream = webRTCHandler.getLocalStream();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      setIsMicrophoneOn(!!audioTrack && audioTrack.readyState === 'live');
    }
  }, []);

  const handleCameraToggle = async () => {
    // If media is disabled by host and user is not host, do nothing
    if (isMediaDisabledByHost && !isRoomHost) {
      return;
    }

    const localStream = webRTCHandler.getLocalStream();
    if (localStream) {
      if (isCameraOn) {
        // Stop the camera
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;  // First disable the track
          videoTrack.stop();  // Then stop it
          localStream.removeTrack(videoTrack);
          
          // Update the video element to show blank screen
          const localVideo = document.querySelector('video[data-local="true"]');
          if (localVideo) {
            localVideo.srcObject = new MediaStream(localStream.getAudioTracks());
          }
        }
      } else {
        // Start the camera
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { min: 320, ideal: 640, max: 1280 },
              height: { min: 240, ideal: 480, max: 720 },
              frameRate: { ideal: 24 }
            }
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          
          // Add the new video track to the stream
          localStream.addTrack(newVideoTrack);
          
          // Update the video element with the new stream
          const localVideo = document.querySelector('video[data-local="true"]');
          if (localVideo) {
            const newMediaStream = new MediaStream([
              ...localStream.getAudioTracks(),
              newVideoTrack
            ]);
            localVideo.srcObject = newMediaStream;
          }

          // Notify peers about the track change
          if (typeof wss.updatePeerConnections === 'function') {
            wss.updatePeerConnections(localStream);
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          return;
        }
      }
      setIsCameraOn(!isCameraOn);
    }
  };

  useEffect(() => {
    // Initialize camera state based on track status
    const localStream = webRTCHandler.getLocalStream();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      setIsCameraOn(!!videoTrack && videoTrack.readyState === 'live');
    }
  }, []);

  const handleScreenToggle = async () => {
    try {
      if (isScreenOn) {
        const success = await webRTCHandler.stopScreenSharing();
        if (success) {
          setIsScreenOn(false);
        }
      } else {
        const success = await webRTCHandler.startScreenSharing();
        if (success) {
          setIsScreenOn(true);
          // Add screen track ended listener
          const screenStream = webRTCHandler.getScreenStream();
          if (screenStream) {
            screenStream.getVideoTracks()[0].onended = () => {
              webRTCHandler.stopScreenSharing();
              setIsScreenOn(false);
            };
          }
        }
      }
    } catch (err) {
      console.error('Error toggling screen share:', err);
      setIsScreenOn(false);
      // Show error message to user
      alert(err.message || 'Failed to start screen sharing');
    }
  };

  const handleParticipantsToggle = () => {
    setIsParticipantsVisible(!isParticipantsVisible);
    if (!isParticipantsVisible) {
      setIsChatsVisible(false);
    }
  };

  const handleChatsToggle = () => {
    setIsChatsVisible(!isChatsVisible);
    if (!isChatsVisible) {
      setIsParticipantsVisible(false);
    }
  };

  const handleLabelToggle = () => {
    setIsLabelVisible(!isLabelVisible);
  };

  const handleDisconnect = () => {
    webRTCHandler.stopLocalStream();
    wss.leaveRoom();
    navigate('/');
  };

  return (
    <>
      {/* Floating Panels */}
      <Box sx={{ 
        position: 'fixed',
        top: '0px',
        left: '16px',
        zIndex: 1200
      }}>
        {isParticipantsVisible && (
          <Participants
            onClose={handleParticipantsToggle}
            sx={{ 
              position: 'relative',
              top: 'auto',
              left: 'auto',
              m: 0,
              mb: isChatsVisible ? 2 : 0
            }}
          />
        )}
        {isChatsVisible && (
          <Chats
            onClose={handleChatsToggle}
            sx={{ 
              position: 'relative',
              top: 'auto',
              left: 'auto',
              m: 0
            }}
          />
        )}
      </Box>

      {/* Controls */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        borderRadius: '40px',
        backgroundColor: 'black',
        boxShadow: '0 2px 2px rgba(0,0,0,0.15)',
      }}>
        <Stack direction='row' spacing={1} alignItems='center' justifyContent='center'>
          <IconButton 
            sx={{ 
              backgroundColor: isMediaDisabledByHost && !isRoomHost ? 'rgba(128, 128, 128, 0.5)' : 'white', 
              borderRadius: '50%', 
              width: { xs: 36, sm: 48 },
              height: { xs: 36, sm: 48 },
              '&:hover': { 
                backgroundColor: isMediaDisabledByHost && !isRoomHost ? 'rgba(128, 128, 128, 0.5)' : 'rgba(198, 198, 198, 0.86)',
                cursor: isMediaDisabledByHost && !isRoomHost ? 'not-allowed' : 'pointer'
              } 
            }}
            onClick={handleMicrophoneToggle}
            disabled={isMediaDisabledByHost && !isRoomHost}
          >
            {isMicrophoneOn ? <Microphone color={isMediaDisabledByHost && !isRoomHost ? "gray" : "black"} /> : <MicrophoneSlash color={isMediaDisabledByHost && !isRoomHost ? "gray" : "black"} />}
          </IconButton>
          <IconButton 
            sx={{ 
              backgroundColor: isMediaDisabledByHost && !isRoomHost ? 'rgba(128, 128, 128, 0.5)' : 'white', 
              borderRadius: '50%', 
              width: { xs: 36, sm: 48 },
              height: { xs: 36, sm: 48 },
              '&:hover': { 
                backgroundColor: isMediaDisabledByHost && !isRoomHost ? 'rgba(128, 128, 128, 0.5)' : 'rgba(198, 198, 198, 0.86)',
                cursor: isMediaDisabledByHost && !isRoomHost ? 'not-allowed' : 'pointer'
              } 
            }}
            onClick={handleCameraToggle}
            disabled={isMediaDisabledByHost && !isRoomHost}
          >
            {isCameraOn ? <VideoCamera color={isMediaDisabledByHost && !isRoomHost ? "gray" : "black"} /> : <VideoCameraSlash color={isMediaDisabledByHost && !isRoomHost ? "gray" : "black"} />}
          </IconButton>
          <IconButton 
            onClick={handleScreenToggle}
            sx={{
              backgroundColor: isScreenOn ? 'primary.main' : 'white',
              borderRadius: '50%',
              width: { xs: 36, sm: 48 },
              height: { xs: 36, sm: 48 },
              '&:hover': {
                backgroundColor: isScreenOn ? 'primary.dark' : 'rgba(198, 198, 198, 0.86)'
              }
            }}
          >
            {isScreenOn ? <MonitorPlay color="white" size={24} /> : <Monitor color="black" size={24} />}
          </IconButton>
          <IconButton 
            sx={{ 
              backgroundColor: 'white', 
              borderRadius: '50%', 
              width: { xs: 36, sm: 48 },
              height: { xs: 36, sm: 48 },
              '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } 
            }}
            onClick={handleParticipantsToggle}
          >
            <Users color="black" />
          </IconButton>
          <IconButton 
            sx={{ 
              backgroundColor: 'white', 
              borderRadius: '50%', 
              width: { xs: 36, sm: 48 },
              height: { xs: 36, sm: 48 },
              '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } 
            }}
            onClick={handleChatsToggle}
          >
            <Chat color="black" />
          </IconButton>
          <IconButton 
            sx={{ 
              backgroundColor: 'white', 
              borderRadius: '50%', 
              width: { xs: 36, sm: 48 },
              height: { xs: 36, sm: 48 },
              '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } 
            }}
            onClick={handleLabelToggle}
          >
            <Info color="black" />
          </IconButton>
          <IconButton 
            sx={{ 
              backgroundColor: 'red', 
              borderRadius: '50%', 
              width: { xs: 36, sm: 48 },
              height: { xs: 36, sm: 48 },
              '&:hover': { backgroundColor: 'rgba(255, 0, 0, 0.86)' } 
            }}
            onClick={handleDisconnect}
          >
            <PhoneDisconnect color="white" />
          </IconButton>
        </Stack>
      </Box>
    </>
  );
}

export default Video;