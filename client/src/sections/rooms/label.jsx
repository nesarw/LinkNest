import { Box, Typography } from "@mui/material";

const Label = () => {
  const roomId = "123-456-789";
  return (
    <Box sx={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      p: 3,
      color: 'black',
      backgroundColor: 'white',
      borderRadius: 2,
      border: '2px solid black',
    }}>
        <Typography variant="subtitle1" align="justify">
        Your Meeting Ready!
      </Typography>
      <Typography variant="subtitle1" align="justify">
        ID: {roomId}
      </Typography>
      
    </Box>
  );
}

export default Label;