import React from "react";
import { Box, Button, Card, Container, Stack, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";


const Intro = () => {
  const navigate = useNavigate();

  const pushtoHostPage = () => {
    navigate('/join-room?host=true');
  };

  const pushtoJoinPage = () => {
    navigate('/join-room');
  };

  return <
    Container>
    <Box sx={{
      width: "100%", height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
    }

    }>
      <Card sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 5, py: 8,
        width: 400,
        rowGap: 3,
        border: '2px solid #000',
        borderRadius: 8
      }}>
        <Typography variant="h3" align="left" fontSize={40}>
        Connect with anyone you like...
        </Typography>
        <Typography variant="h6" align="justify" fontSize={15}>
        Connect , Collaborate , Celebrate with anyone or everywhere one with us...
        </Typography>
        <Stack direction='column' alignItems='center' spacing={2} sx={{ width: 1 }}>
          <Button onClick={pushtoHostPage} fullWidth variant="contained" sx={{ backgroundColor: 'black', color: 'white', padding: '16px', fontSize: '18px' , width: '100%' }}>
            New Meeting
          </Button>
          <Button onClick={pushtoJoinPage} fullWidth variant="outlined" color="black" sx={{ padding: '16px', fontSize: '18px', width: '100%' }}>
            Join Meeting
          </Button>
        </Stack>
      </Card>
      
    </Box>
  </Container>;
}

export default Intro;