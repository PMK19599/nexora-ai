import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config/runtime';

let socket: Socket | null = null;

export const connectSocket = (): Socket | null => {
  try {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socket.on('connect', () => undefined);

    socket.on('connect_error', (err) => {
      // Silent fail — sockets are optional
      console.debug('Socket connection error (non-critical):', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.debug('Socket disconnected:', reason);
    });

    return socket;
  } catch (err) {
    console.debug('Socket init failed (non-critical):', err);
    return null;
  }
};

export const disconnectSocket = (): void => {
  try {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  } catch {}
};

export const getSocket = (): Socket | null => socket;

export const joinRoom = (id: string): void => {
  try { socket?.emit('chat:join', id); } catch {}
};

export const leaveRoom = (id: string): void => {
  try { socket?.emit('chat:leave', id); } catch {}
};

export const sendMessage = (roomId: string, message: string): void => {
  try { socket?.emit('chat:message', { roomId, message }); } catch {}
};

export const sendTyping = (roomId: string, isTyping: boolean): void => {
  try { socket?.emit('chat:typing', { roomId, isTyping }); } catch {}
};
