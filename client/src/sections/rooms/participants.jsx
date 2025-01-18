import React from "react";
import { Box, Divider, Stack, Typography, IconButton } from "@mui/material";
import { X } from "phosphor-react";

const list = [
    {
        id: 1,
        identity: 'User 1',
    },
    {
        id: 2,
        identity: 'User 2',
    },
    {
        id: 3,
        identity: 'User 3',
    },
    {
        id: 4,
        identity: 'User 4',
    },
];

const Participants = ({ onClose }) => {
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
            m: '30px 0',
        }}>
            <Box sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                rowGap: 0,
                width: '100%',
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" align="left">Participants -</Typography>
                    <IconButton 
                        onClick={onClose}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <X color="black" />
                    </IconButton>
                </Box>
                <Stack>
                    {list.map(({ id, identity }) => (
                        <Stack key={id} spacing={1} sx={{
                            p: 1,
                        }} >
                            <Box sx={{
                                px: 2,
                                py: 2,
                                borderRadius: 1,
                                '&:hover': {
                                    backgroundColor: 'black',
                                    color: 'white',
                                }
                            }}>
                                <Typography>
                                    {identity}
                                </Typography>
                            </Box>
                            <Divider />
                        </Stack>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}

export default Participants;