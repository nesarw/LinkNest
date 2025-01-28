import React from "react";
import { Box, Typography, IconButton, TextField, InputAdornment } from "@mui/material";
import { X, PaperPlaneRight } from "phosphor-react";

const Chat = ({ onClose, sx }) => {
    return (
        <Box sx={{
            p: 0,
            width: 320,
            height: '98vh',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid black',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            backgroundColor: 'white',
            m: '8px 0',
            borderRadius: '20px',
            // ...sx,
        }}>
            <Box sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                rowGap: 0,
                width: '100%',
                flexGrow: 1,
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" align="left">Chat -</Typography>
                    <IconButton 
                        onClick={onClose}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <X color="black" />
                    </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                    {/* Chat messages will go here */}
                </Box>
                <Box sx={{ px: 0, pb: 2, width: '95%' }}>
                    <TextField
                        fullWidth
                        placeholder="Type a message..."
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton>
                                        <PaperPlaneRight />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}

export default Chat;