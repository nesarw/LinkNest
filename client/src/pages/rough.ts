// import React, { useEffect, useState } from "react";
// import { Stack } from '@mui/material';
// import Label from '../sections/rooms/label';
// import Participants from '../sections/rooms/participants';
// import Video from "../sections/rooms/video";
// //import Chat from "../sections/rooms/chat';
// import * as webRTCHandler from '../sections/utils/webRTCHandler';
// import { useSelector } from "react-redux";
// import Overlay from "../sections/rooms/overlay";
// import { io } from 'socket.io-client';
// import { useNavigate } from 'react-router-dom';

// const socket = io('http://localhost:8000', { autoConnect: false });

// const Room = () => {
//   const { isRoomHost, identity, roomId, showOverlay } = useSelector((state) => state.app);
//   const [participants, setParticipants] = useState([]);
//   const [createdRoomID, setCreatedRoomID] = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     console.log('Initializing local preview and connection');
//     webRTCHandler.localPreviewInitConnection(isRoomHost, identity, roomId);

//     if (!socket.connected) {
//       console.log('Connecting socket');
//       socket.connect();
//     }

//     if (isRoomHost) {
//       console.log('Creating new room');
//       socket.emit('create-new-room', identity);
//     } else {
//       console.log('Joining room');
//       socket.emit('join-room', { roomID: roomId, identity });
//     }

//     socket.on('room-created', ({ roomID }) => {
//       console.log(`Room created with ID: ${roomID}`);
//       setCreatedRoomID(roomID);
//     });

//     socket.on('update-participants', (participants) => {
//       console.log('Updating participants', participants);
//       setParticipants(participants);
//     });

//     socket.on('user-joined', ({ userID }) => {
//       console.log(`User ${userID} joined the room`);
//     });

//     socket.on('room-closed', () => {
//       alert('The host has left the room. You will be redirected to the main page.');
//       navigate('/');
//     });

//     socket.on('error', ({ message }) => {
//       console.error(message);
//     });

//     return () => {
//       console.log('Cleaning up socket listeners');
//       socket.off('room-created');
//       socket.off('update-participants');
//       socket.off('user-joined');
//       socket.off('room-closed');
//       socket.off('error');
//       socket.disconnect();
//     };
//   }, [isRoomHost, identity, roomId, navigate]);

//   return (
//     <Stack direction="row" alignItems="center" sx={{ position: 'relative', width: 1, height: 'calc(100vh - 64px)' }}>
//       {/* Participants */}
//       <Participants participants={participants} onClose={() => {}} />
//       {/* Video Section */}
//       <Video />
//       {/* Group Chat Section */}
//       <Chat />
//       {/* ID Label */}
//       <Label roomId={createdRoomID || roomId} />
//       {showOverlay && <Overlay />}
//     </Stack>
//   );
// }

// export default Room;