import { io } from 'socket.io-client';

// If we are in production (deployed), use the Environment Variable.
// If we are local, use localhost:3001
const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(URL);