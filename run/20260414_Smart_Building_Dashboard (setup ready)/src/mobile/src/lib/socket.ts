import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config/api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      path: '/socket.io',
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function connectSocket(token: string, buildingId?: string) {
  const s = getSocket();
  s.auth = { token };
  s.connect();
  s.on('connect', () => {
    if (buildingId) {
      s.emit('join:building', buildingId);
    }
  });
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
