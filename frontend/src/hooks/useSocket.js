import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(event, handler, deps = []) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socketUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/api$/, '');
    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on(event, handler);

    return () => {
      socketRef.current?.off(event, handler);
      socketRef.current?.disconnect();
    };
  }, deps);

  return socketRef.current;
}
