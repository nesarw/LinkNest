import React, { useEffect, useState } from "react";
import { Box, IconButton, Stack } from "@mui/material";
import { Microphone, MicrophoneSlash, VideoCamera, VideoCameraSlash, Chat, Monitor, MonitorPlay, Users, Info, PhoneDisconnect } from "phosphor-react";
import Participants from "./participants";
import Label from "./label";
import Chats from "./chat";
import { useNavigate } from "react-router-dom";
import * as wss from "../utils/wss";
import * as webRTCHandler from "../utils/webRTCHandler";

const Video = () => {
  const navigate = useNavigate();
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenOn, setIsScreenOn] = useState(true);
  const [isParticipantsVisible, setIsParticipantsVisible] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(false);
  const [isChatsVisible, setIsChatsVisible] = useState(false);

  useEffect(() => {
    const handleRoomClosed = () => {
      navigate('/');
    };

    wss.socket.on('room-closed', handleRoomClosed);

    return () => {
      wss.socket.off('room-closed', handleRoomClosed);
    };
  }, [navigate]);

  const handleMicrophoneToggle = async () => {
    const localStream = webRTCHandler.getLocalStream();
    if (localStream) {
      if (isMicrophoneOn) {
        // Stop the microphone
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.stop();
          localStream.removeTrack(audioTrack);
        }
      } else {
        // Start the microphone
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          const newAudioTrack = newStream.getAudioTracks()[0];
          localStream.addTrack(newAudioTrack);
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
    const localStream = webRTCHandler.getLocalStream();
    if (localStream) {
      if (isCameraOn) {
        // Stop the camera
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStream.removeTrack(videoTrack);
        }
      } else {
        // Start the camera
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              frameRate: { min: 15, ideal: 30, max: 30 }
            }
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          localStream.addTrack(newVideoTrack);
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

  const handleScreenToggle = () => {
    setIsScreenOn(!isScreenOn);
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
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='center'>
          <IconButton 
            sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}
            onClick={handleMicrophoneToggle}
          >
            {isMicrophoneOn ? <Microphone color="black" /> : <MicrophoneSlash color="black" />}
          </IconButton>
          <IconButton 
            sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}
            onClick={handleCameraToggle}
          >
            {isCameraOn ? <VideoCamera color="black" /> : <VideoCameraSlash color="black" />}
          </IconButton>
          <IconButton 
            sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}
            onClick={handleScreenToggle}
          >
            {isScreenOn ? <Monitor color="black" /> : <MonitorPlay color="black" />}
          </IconButton>
          <IconButton 
            sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}
            onClick={handleParticipantsToggle}
          >
            <Users color="black" />
          </IconButton>
          <IconButton 
            sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}
            onClick={handleChatsToggle}
          >
            <Chat color="black" />
          </IconButton>
          <IconButton 
            sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}
            onClick={handleLabelToggle}
          >
            <Info color="black" />
          </IconButton>
          <IconButton 
            sx={{ backgroundColor: 'red', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(255, 0, 0, 0.86)' } }}
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