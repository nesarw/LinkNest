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
  const search = useLocation().search;
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const isHost = new URLSearchParams(search).get('host') === 'true';
    setIsRoomHost(isHost);
    //setting in Redux store that user is a Host
    dispatch(UpdateIsRoomHost(isHost));
  }, [search, dispatch]);

  const navigate = useNavigate();
  const handleJoinRoom = async () => {
    //dispatch name to redux store 
    dispatch(SetIdentity(Namevalue));
    if (isRoomHost) {
      createRoom();
    }
    else {
      joinRoom();
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
      }
      else {
        //dispatch name and roomid to redux store 
        dispatch(SetRoomID(RoomIDvalue));
        navigate('/room');
      }
    }
    else {
      setErrorMessage('Meeting not Found. Check Meeting ID');
    }
  };

  const cancel = () => {
    navigate('/');
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
              {isRoomHost ? 'Host Meeting' : 'Join Meeting'}
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
            {!isRoomHost && (
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
            )}

            <Stack direction="row" alignItems="center" spacing={0.5} width='100%'>
              <Checkbox value={connectionOnlyWithAudio} onChange={(e) => {
                dispatch(SetConnectionOnlyWithAudio(e.target.checked));
              }} sx={{ color: 'white' }} />
              <Typography variant="subtitle2" sx={{ color: 'white' }}>Audio only</Typography>
            </Stack>
            {errorMessage &&
              <Typography variant="subtitle2" sx={{ color: 'red' }}>{errorMessage}</Typography>
            }
            <Stack direction='row' alignItems='center' spacing={2}>
              <Button onClick={handleJoinRoom} fullWidth variant="contained" sx={{ backgroundColor: 'white', color: 'black' }}>
                {isRoomHost ? 'Host Now' : 'Join Now'}
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