import React from "react";
import { Box, Button, Card, Container, Stack, Typography, TextField, Checkbox } from '@mui/material';

const Join = () => {
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
              <Button fullWidth variant="contained" sx={{ backgroundColor: 'white', color: 'black' }}>
                Host Meeting
              </Button>
              <Button fullWidth variant="outlined" sx={{ color: 'white', borderColor: 'white' }}>
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