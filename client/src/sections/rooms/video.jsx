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
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: 'white' }}>
      {isParticipantsVisible && (
        <Participants
          onClose={handleParticipantsToggle}
          sx={{ zIndex: isChatsVisible ? 9 : 10 }}
        />
      )}
      {isChatsVisible && (
        <Chats
          onClose={handleChatsToggle}
          sx={{ zIndex: isParticipantsVisible ? 9 : 10 }}
        />
      )}
      {isLabelVisible && <Label />}
      <Box sx={{
        position: 'absolute',
        bottom: '0%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
        width: 700,
        backgroundColor: 'black',
        borderRadius: 80, 
        border: '2px solid black',
      }}>
        <Box sx={{
          width: '90%',
          height: 100,
          backgroundColor: 'black',
          borderRadius: 80,
          border: '2px solid black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 1,
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
      </Box>
    </Box>
  );
}

export default Video;