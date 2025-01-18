import React, { useState } from "react";
import { Box, IconButton, Stack } from "@mui/material";
import { Microphone, MicrophoneSlash, VideoCamera, VideoCameraSlash, Chat, Monitor, MonitorPlay, Users, Info, PhoneDisconnect } from "phosphor-react";
import Participants from "./participants";

const Video = () => {
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenOn, setIsScreenOn] = useState(true);
  const [isParticipantsVisible, setIsParticipantsVisible] = useState(false);

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
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: 'white' }}>
      {isParticipantsVisible && <Participants />}
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
            <IconButton sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}>
              <Chat color="black" />
            </IconButton>
            <IconButton sx={{ backgroundColor: 'white', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(198, 198, 198, 0.86)' } }}>
              <Info color="black" />
            </IconButton>
            <IconButton sx={{ backgroundColor: 'red', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(255, 0, 0, 0.86)' } }}>
              <PhoneDisconnect color="white" />
            </IconButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export default Video;