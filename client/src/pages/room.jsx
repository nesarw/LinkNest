import React, { useEffect } from "react";
import { Stack, Box } from '@mui/material';
import Label from '../sections/rooms/label';
import Participants from '../sections/rooms/participants';
import Video from "../sections/rooms/video";
import Chat from "../sections/rooms/chat";
import * as webRTCHandler from '../sections/utils/webRTCHandler'
import { useSelector } from "react-redux";
import Overlay from "../sections/rooms/overlay";

const Room = () => {
  const {isRoomHost, identity, roomId, showOverlay} = useSelector((state) => state.app);
  
  useEffect(() => {
    webRTCHandler.localPreviewInitConnection(isRoomHost, identity, roomId);
    return () => {
      webRTCHandler.stopLocalStream();
    };
  }, []);

  return (
    <Stack direction="row" alignItems="center" sx={{ position: 'relative', width: 1, height: 'calc(100vh - 64px)' }}>
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 2,
        width: '100%',
        height: '100%',
        p: 2,
        backgroundColor: '#f5f5f5'
      }}>
        <Box id="video-grid" sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          width: '100%',
          height: '100%'
        }}></Box>
      </Box>
      <Video />
      <Label roomId={roomId} />
      {showOverlay && <Overlay/>}
    </Stack>
  );
}

export default Room;