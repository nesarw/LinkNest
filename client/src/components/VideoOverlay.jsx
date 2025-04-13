import React from 'react';
import { Box, Typography } from '@mui/material';

const VideoOverlay = ({ identity }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: '12px',
      }}
    >
      <Typography
        variant="body1"
        sx={{
          color: 'white',
          textAlign: 'center',
          padding: '16px',
        }}
      >
        {identity} turned off camera
      </Typography>
    </Box>
  );
};

export default VideoOverlay; 