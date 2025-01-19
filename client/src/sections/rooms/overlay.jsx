import { Box, CircularProgress } from "@mui/material";

const Overlay = () => {
  return (
    <Box sx={{
        position: 'absolute',
        height: '100%',
        width: '100%',
        backgroundColor: 'rgba(240, 240, 240, 0.31)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',   
        justifyContent: 'center',
    }}>
        <CircularProgress sx={{ color: 'black' }} />
    </Box>
  )
}

export default Overlay;