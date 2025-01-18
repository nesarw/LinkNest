import React from "react";
import { Stack } from '@mui/material';
import Label from '../sections/rooms/label';
import Participants from '../sections/rooms/participants';
import Video from "../sections/rooms/video";
import Chat from "../sections/rooms/chat";

const Room = () => {
  return (
    <Stack direction="row" alignItems="center" sx={{ position: 'relative', width: 1, height: 'calc(100vh - 64px)' }}>
      {/* Participants */}
      {/* Video Section */}
      <Video />
      {/* Group Chat Section */}
      {/* ID Label */}
      {/* <Label /> */}
    </Stack>
  );
}

export default Room;