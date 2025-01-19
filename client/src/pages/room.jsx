import React, { useEffect } from "react";
import { Stack } from '@mui/material';
import Label from '../sections/rooms/label';
import Participants from '../sections/rooms/participants';
import Video from "../sections/rooms/video";
import Chat from "../sections/rooms/chat";
import * as webRTCHandler from '../sections/utils/webRTCHandler'
import { useSelector } from "react-redux";
import Overlay from "../sections/rooms/overlay";

const Room = () => {
  const {isRoomHost , identity , roomId, showOverlay} = useSelector((state) => state.app);
  useEffect(() => {
    webRTCHandler.localPreviewInitConnection(isRoomHost, identity, roomId)
  }, []);

  return (
    <Stack direction="row" alignItems="center" sx={{ position: 'relative', width: 1, height: 'calc(100vh - 64px)' }}>
      {/* Participants */}
      {/* Video Section */}
      <Video />
      {/* Group Chat Section */}
      {/* ID Label */}
      {/* <Label /> */}
      {showOverlay && <Overlay/>}
    </Stack>
  );
}

export default Room;