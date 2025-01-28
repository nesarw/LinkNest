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
    <>
      {/* Main Content */}
      <Stack 
        direction="column"
        spacing={3}
        alignItems="center"
        sx={{ 
          position: 'fixed', 
          top: '8px',
          left: '1%',
          width: '98%',
          height: 'calc(100vh - 16px)',
          backgroundColor: 'grey',
          borderRadius: '20px',
          overflow: 'hidden'
        }}
      >
        {/* Video Stream Grid */}
        <Box sx={{ 
          width: '100%',
          maxWidth: '1200px',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 1, sm: 2, md: 3 },
          pt: 2
        }}>
          <Box id="video-grid" sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fit, minmax(300px, 1fr))'
            },
            gap: { xs: 1, sm: 0 },
            width: '100%',
            height: '100%',
            '& > *': {
              position: 'relative',
              paddingTop: '56.35%',
              '& > *': {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '12px',
                backgroundColor: '#000'
              }
            }
          }}></Box>
        </Box>

        {/* Video Controls */}
        <Box sx={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          px: { xs: 1, sm: 2, md: 3 },
          pb: 2
        }}>
          <Video />
        </Box>
        <Label roomId={roomId} />
        {showOverlay && <Overlay/>}
      </Stack>

      {/* Floating Panels Container */}
      <Box sx={{ 
        position: 'fixed',
        top: '50%',
        left: '16px',
        transform: 'translateY(-50%)',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Participants and Chat will be rendered here when their respective buttons are clicked */}
      </Box>
    </>
  );
}

export default Room;