import axios from 'axios';
export const api = axios.create({ baseURL: '/api' });
export function errorMessage(error) {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data?.error)
            return data.error;
        if (error.code === 'ERR_NETWORK')
            return 'The API is not reachable. Start the server and MongoDB, then try again.';
        return error.message;
    }
    return 'Something went wrong';
}
