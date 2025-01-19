import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    identity: "",
    roomId: "",
    isRoomHost: false,
    connectionOnlyWithAudio: false,
    showOverlay: true,
}

const slice = createSlice({
    name: "app",
    initialState,
    reducers: {
        //update IS_ROOM_HOST
        updateIsRoomHost: (state, action) => {
            state.isRoomHost = action.payload;
        },
        updateIdentity(state, action) {
            state.identity = action.payload;
        },
        updateRoomID(state, action) {
            state.roomId = action.payload;
        },
        updateconnectionOnlyWithAudio(state, action) {
            state.connectionOnlyWithAudio = action.payload;
        },
        updateShowOverlay(state, action) {
            state.showOverlay = action.payload;
        }
    }
});

export default slice.reducer;

//Actions
export const { updateIsRoomHost, updateIdentity, updateRoomID, updateconnectionOnlyWithAudio, updateShowOverlay } = slice.actions;

export function UpdateIsRoomHost(value) {
    return async (dispatch) => {
        dispatch(updateIsRoomHost(value));
    }
}

export function SetRoomID(value) {
    return async (dispatch) => {
        dispatch(updateRoomID(value));
    }
}

export function SetIdentity(value) {
    return async (dispatch) => {
        dispatch(updateIdentity(value));
    }
}

export function SetConnectionOnlyWithAudio(value) {
    return async (dispatch) => {
        dispatch(updateconnectionOnlyWithAudio(value));
    }
}

export function setShowOverlay(value) {
    return async (dispatch) => {
        dispatch(updateShowOverlay(value));
    }
}