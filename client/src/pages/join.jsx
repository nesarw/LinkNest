import React, { useState, useEffect } from "react";
import { Box, Button, Card, Container, Stack, Typography, TextField, Checkbox } from '@mui/material';
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { SetConnectionOnlyWithAudio, SetIdentity, SetRoomID, UpdateIsRoomHost } from "../redux/slices/app";
import { getRoomeExists } from "../sections/utils/api";

const Join = () => {
  const [RoomIDvalue, setRoomIDvalue] = useState('');
  const [Namevalue, setNamevalue] = useState('');
  const [isRoomHost, setIsRoomHost] = useState(false);
  const [connectionOnlyWithAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const search = useLocation().search;
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const isHost = new URLSearchParams(search).get('host') === 'true';
    setIsRoomHost(isHost);
    dispatch(UpdateIsRoomHost(isHost));
  }, [search, dispatch]);

  const navigate = useNavigate();
  const handleJoinRoom = async (e) => {
    // Prevent default form submission
    e?.preventDefault();
    
    // Validation
    if (!Namevalue.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (!isRoomHost && !RoomIDvalue.trim()) {
      setErrorMessage('Please enter a meeting ID');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      dispatch(SetIdentity(Namevalue));
      if (isRoomHost) {
        createRoom();
      } else {
        await joinRoom();
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setErrorMessage('Failed to join meeting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = () => {
    navigate('/room');
  };

  const joinRoom = async () => {
    const response = await getRoomeExists(RoomIDvalue);
    const { roomExists, full } = response;
    if (roomExists) {
      if (full) {
        setErrorMessage('Meeting is full, please try again.');
      } else {
        dispatch(SetRoomID(RoomIDvalue));
        navigate('/room');
      }
    } else {
      setErrorMessage('Meeting not Found. Check Meeting ID');
    }
  };

  const cancel = () => {
    navigate('/');
  };

  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{
        width: "100%",
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 0 },
        backgroundImage: 'url(/assets/join.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <Card sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 5 },
          py: { xs: 4, sm: 8 },
          width: '100%',
          maxWidth: 400,
          rowGap: 3,
          border: '2px solid #fff',
          borderRadius: 8,
          backgroundColor: 'black',
          color: 'white'
        }}>
          <form onSubmit={handleJoinRoom} style={{ width: '100%' }}>
            <Stack spacing={3} width={'100%'}>
              <Typography 
                textAlign={'center'} 
                variant="h3" 
                fontSize={{ xs: 32, sm: 40 }} 
                sx={{ color: 'white' }}
              >
                {isRoomHost ? 'Host Meeting' : 'Join Meeting'}
              </Typography>
              <TextField
                size="small"
                fullWidth
                required
                placeholder="Enter Name"
                variant="outlined"
                value={Namevalue}
                onChange={(e) => {
                  setNamevalue(e.target.value);
                  setErrorMessage('');
                }}
                InputProps={{
                  style: { color: 'white', borderColor: 'white' },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'white' },
                    '&:hover fieldset': { borderColor: 'white' },
                    '&.Mui-focused fieldset': { borderColor: 'white' },
                  },
                  '& .MuiInputBase-input': { color: 'white' },
                }}
              />
              {!isRoomHost && (
                <TextField
                  size="small"
                  fullWidth
                  required
                  placeholder="Enter Meeting ID"
                  variant="outlined"
                  value={RoomIDvalue}
                  onChange={(e) => {
                    setRoomIDvalue(e.target.value);
                    setErrorMessage('');
                  }}
                  InputProps={{
                    style: { color: 'white', borderColor: 'white' },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'white' },
                      '&:hover fieldset': { borderColor: 'white' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                    '& .MuiInputBase-input': { color: 'white' },
                  }}
                />
              )}

              <Stack direction="row" alignItems="center" spacing={0.5} width='100%'>
                <Checkbox
                  value={connectionOnlyWithAudio}
                  onChange={(e) => {
                    dispatch(SetConnectionOnlyWithAudio(e.target.checked));
                  }}
                  sx={{ 
                    color: 'white',
                    '&.Mui-checked': { color: 'white' },
                  }}
                />
                <Typography variant="subtitle2" sx={{ color: 'white' }}>Audio only</Typography>
              </Stack>
              
              {errorMessage && (
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: 'red',
                    textAlign: 'center',
                    animation: 'fadeIn 0.3s ease-in'
                  }}
                >
                  {errorMessage}
                </Typography>
              )}
              
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                alignItems='center' 
                spacing={2}
                width="100%"
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    backgroundColor: 'white',
                    color: 'black',
                    '&:hover': {
                      backgroundColor: '#e0e0e0',
                    },
                    '&:active': {
                      backgroundColor: '#d0d0d0',
                    },
                    height: 48,
                  }}
                >
                  {isLoading ? 'Processing...' : (isRoomHost ? 'Host Now' : 'Join Now')}
                </Button>
                <Button
                  onClick={cancel}
                  fullWidth
                  variant="outlined"
                  disabled={isLoading}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    height: 48,
                    '&:hover': {
                      borderColor: '#e0e0e0',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </form>
        </Card>
      </Box>
    </Container>
  );
}

export default Join;