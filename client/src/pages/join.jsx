import React from "react";
import { Box, Button, Card, Container, Stack, Typography, TextField, Checkbox } from '@mui/material';
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';


const Join = () => {
  const {RoomIDvalue, setRoomIDvalue} = useState('');
  const {Namevalue, setNamevalue} = useState('');
  const search = useLocation().search;

  useEffect(() => {
    const isRoomHost = new URLSearchParams(search).get('host');

    //set in Redux store that user is a Host
    
  },[]);

  const navigate = useNavigate();
  const cancel = () => {
    navigate('/');
  };
  
  const joinRoom = () => {
    navigate('/room');
  };

  return (
    <Container>
      <Box sx={{
        width: "100%", height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <Card sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 5, py: 8,
          width: 400,
          rowGap: 3,
          border: '2px solid #fff',
          borderRadius: 8,
          backgroundColor: 'black',
          color: 'white'
        }}>
          <Stack spacing={3} width={'100%'}>
            <Typography textAlign={'center'} variant="h3" fontSize={40} sx={{ color: 'white' }}>
              Host Meeting
            </Typography>
            <TextField 
              size="small" 
              fullWidth 
              placeholder="Enter Name" 
              variant="outlined" 
              value={Namevalue}
              onChange={(e) => setNamevalue(e.target.value)}
              InputProps={{
                style: { color: 'white', borderColor: 'white' },
              }}
              InputLabelProps={{
                style: { color: 'white' },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'white',
                  },
                  '&:hover fieldset': {
                    borderColor: 'white',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
                '& .MuiInputLabel-root': {
                  color: 'white',
                },
              }}
            />
            <TextField 
              size="small" 
              fullWidth 
              placeholder="Enter Meeting ID" 
              variant="outlined" 
              value={RoomIDvalue}
              onChange={(e) => setRoomIDvalue(e.target.value)}
              InputProps={{
                style: { color: 'white', borderColor: 'white' },
              }}
              InputLabelProps={{
                style: { color: 'white' },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'white',
                  },
                  '&:hover fieldset': {
                    borderColor: 'white',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white',
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
                '& .MuiInputLabel-root': {
                  color: 'white',
                },
              }}
            />
            <Stack direction="row" alignItems="center" spacing={0.5} width='100%'>
              <Checkbox sx={{ color: 'white' }} />
              <Typography variant="subtitle2" sx={{ color: 'white' }}>Audio only</Typography>
            </Stack>
            <Stack direction='row' alignItems='center' spacing={2}>
              <Button onClick={joinRoom} fullWidth variant="contained" sx={{ backgroundColor: 'white', color: 'black' }}>
                Host Meeting
              </Button>
              <Button onClick={cancel} fullWidth variant="outlined" sx={{ color: 'white', borderColor: 'white' }}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Box>
    </Container>
  );
}

export default Join;