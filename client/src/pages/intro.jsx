import React from "react";
import { Box, Button, Card, Container, Stack, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from "react-router-dom";

const Intro = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const pushtoHostPage = () => {
    navigate('/join-room?host=true');
  };

  const pushtoJoinPage = () => {
    navigate('/join-room');
  };

  return <Container disableGutters maxWidth={false}>
    <Box sx={{
      width: "100vw", // Ensure full viewport width
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: { xs: 'center', sm: 'flex-end' }, // Center on mobile, right align on larger screens
      justifyContent: 'center',
      pl: { xs: 0, sm: 0 }, // Left padding only for mobile
      pr: { xs: 0, sm: 15 }, // Add right padding for larger screens
      backgroundImage: 'url(/assets/homepage.jpg)', // Updated path to the image in the public directory
      backgroundSize: 'cover',
      backgroundPosition: 'center', // Align background image to the left
      margin: 0, // Remove any default margin
      mr: { xs: 0, sm: 0 }, // Add right margin for larger screens
    }}>
      <Card sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 5 }, // Smaller horizontal padding on mobile
        py: { xs: 4, sm: 8 }, // Smaller vertical padding on mobile
        width: { xs: '85%', sm: 400 }, // Reduced width on mobile
        maxWidth: { xs: 390, sm: '100%' }, // Max width for mobile
        rowGap: 3,
        border: '2px solid #000',
        borderRadius: 8
      }}>
        <Typography 
          variant="h3" 
          align="center" 
          fontSize={{ xs: 32, sm: 40 }} // Smaller font on mobile
          sx={{ px: { xs: 2, sm: 0 } }} // Add padding on mobile
        >
          Connect with anyone you like...
        </Typography>
        <Typography 
          variant="h6" 
          align="center" 
          fontSize={{ xs: 14, sm: 15 }}
          sx={{ px: { xs: 2, sm: 0 } }} // Add padding on mobile
        >
          Connect , Collaborate , Celebrate with anyone or everywhere one with us...
        </Typography>
        <Stack direction='column' alignItems='center' spacing={2} sx={{ width: 1, px: { xs: 2, sm: 0 } }}>
          <Button 
            onClick={pushtoHostPage} 
            fullWidth 
            variant="contained" 
            sx={{ 
              backgroundColor: 'black', 
              color: 'white', 
              padding: { xs: '12px', sm: '16px' }, 
              fontSize: { xs: '16px', sm: '18px' },
              width: '100%' 
            }}
          >
            New Meeting
          </Button>
          <Button 
            onClick={pushtoJoinPage} 
            fullWidth 
            variant="outlined" 
            color="black" 
            sx={{ 
              padding: { xs: '12px', sm: '16px' }, 
              fontSize: { xs: '16px', sm: '18px' },
              width: '100%' 
            }}
          >
            Join Meeting
          </Button>
        </Stack>
      </Card>
    </Box>
  </Container>;
}

export default Intro;