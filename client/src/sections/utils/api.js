import axios from 'axios';

const serverAPI = "http://localhost:8000/api";

export const getRoomeExists = async (roomID) => {
    const response = await axios.get(`${serverAPI}/rooms-exists/${roomID}`);
    return response.data;

};