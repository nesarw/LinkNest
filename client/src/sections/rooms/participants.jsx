import React from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";

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
];

const Participants = () => {
    return (
        <Box sx={{
            p: 0,
            width: 320,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid black',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            backgroundColor: 'white',
        }}>
            <Box sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                rowGap: 0,
                width: '100%',
            }}>
                <Typography variant="h6" align="left">Participants -</Typography>
                <Stack>
                    {list.map(({ id, identity }) => (
                        <Stack key={id} spacing={1}>
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