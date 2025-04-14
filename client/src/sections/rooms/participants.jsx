import React, { useEffect, useState } from "react";
import { Box, Divider, Stack, Typography, IconButton, Button } from "@mui/material";
import { X, UserMinus, VideoCameraSlash, VideoCamera } from "phosphor-react";
import axios from "axios";
import { useSelector } from "react-redux";
import * as wss from "../utils/wss";

const Participants = ({ onClose }) => {
    const [participants, setParticipants] = useState([]);
    const [isAllMediaDisabled, setIsAllMediaDisabled] = useState(false);
    const isRoomHost = useSelector((state) => state.app.isRoomHost);

    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/participants');
                setParticipants(response.data.participants);
            } catch (error) {
                console.error("Error fetching participants:", error);
            }
        };

        const intervalId = setInterval(fetchParticipants, 1);

        return () => clearInterval(intervalId);
    }, []);

    const handleKickUser = (socketID) => {
        if (isRoomHost) {
            wss.socket.emit("kick-user", { targetUserID: socketID });
        }
    };

    const handleDisableAllMedia = () => {
        if (isRoomHost) {
            wss.socket.emit("host-action", { action: "disable-all-media" });
            setIsAllMediaDisabled(true);
        }
    };

    const handleEnableAllMedia = () => {
        if (isRoomHost) {
            wss.socket.emit("host-action", { action: "enable-all-media" });
            setIsAllMediaDisabled(false);
        }
    };

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
                {isRoomHost && (
                    <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
                        <Button
                            variant="contained"
                            color={isAllMediaDisabled ? "primary" : "error"}
                            size="small"
                            startIcon={isAllMediaDisabled ? <VideoCamera size={16} /> : <VideoCameraSlash size={16} />}
                            onClick={isAllMediaDisabled ? handleEnableAllMedia : handleDisableAllMedia}
                            sx={{ 
                                minWidth: 'auto',
                                px: 1,
                                py: 0.5,
                                backgroundColor: isAllMediaDisabled ? 'rgba(0, 0, 255, 0.7)' : 'rgba(255, 0, 0, 0.7)',
                                '&:hover': {
                                    backgroundColor: isAllMediaDisabled ? 'rgba(0, 0, 255, 0.9)' : 'rgba(255, 0, 0, 0.9)',
                                }
                            }}
                        >
                            {isAllMediaDisabled ? "Enable All Media" : "Disable All Media"}
                        </Button>
                    </Box>
                )}
                <Stack>
                    {participants.map(({ socketID, identity }) => (
                        <Stack key={socketID} spacing={1} sx={{
                            p: 1,
                        }} >
                            <Box sx={{
                                px: 2,
                                py: 2,
                                borderRadius: 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                '&:hover': {
                                    backgroundColor: 'black',
                                    color: 'white',
                                }
                            }}>
                                <Typography>
                                    {identity}
                                </Typography>
                                {isRoomHost && socketID !== wss.socket.id && (
                                    <Button
                                        variant="contained"
                                        color="error"
                                        size="small"
                                        startIcon={<UserMinus size={16} />}
                                        onClick={() => handleKickUser(socketID)}
                                        sx={{ 
                                            minWidth: 'auto',
                                            px: 1,
                                            py: 0.5,
                                            backgroundColor: 'rgba(255, 0, 0, 0.7)',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 0, 0, 0.9)',
                                            }
                                        }}
                                    >
                                        Kick
                                    </Button>
                                )}
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