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

  const handleMicrophoneToggle = () => {
    setIsMicrophoneOn(!isMicrophoneOn);
  };

  const handleCameraToggle = () => {
    setIsCameraOn(!isCameraOn);
  };

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