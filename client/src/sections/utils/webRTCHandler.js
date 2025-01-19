import { setShowOverlay } from "../../redux/slices/app";
import { store } from "../../redux/store";
import * as wss from "./wss";

const constraints = {
    audio: true,
    video: true,
}

let localstream;

export const localPreviewInitConnection = async (isRoomHost, identity, roomId=null ) => {
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        console.log("Local Stream Received");
        store.dispatch(setShowOverlay(false));
        localstream = stream;
        showlocalVideoPreview(localstream);
        isRoomHost ? wss.createNewRoom(identity) : wss.joinRoom({roomID,identity }); 

    }).catch((err) => {
        console.log("error occured when trying to get an access to local stream");
        console.log(err);
    });
};

const showlocalVideoPreview = (stream) => {
    //show local video preview 
};