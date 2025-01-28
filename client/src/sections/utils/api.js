import axios from 'axios';

// Use relative URL which will work with both localhost and ngrok
const serverAPI = "/api";

export const getRoomeExists = async (roomID) => {
    try {
        const response = await axios.get(`${serverAPI}/rooms-exists/${roomID}`);
        return response.data;
    } catch (error) {
        console.error('Error checking room existence:', error);
        return { roomExists: false, full: false };
    }
};