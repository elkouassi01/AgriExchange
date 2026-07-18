import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useUser } from './UserContext';
import { isLocalBrowser } from '../config/api';

const SocketContext = createContext(null);

// En local, Vite (5173) et le backend (5000) sont deux origines différentes — il faut
// une URL explicite. En production, Socket.io tourne sur le même serveur HTTP que
// l'API (derrière le même proxy Nginx) : laisser socket.io-client se connecter à
// l'origine courante (undefined) plutôt que de coder une URL en dur, sans quoi le
// build de prod tentait de se connecter à localhost:5000 depuis le navigateur du
// visiteur — ce qui échoue toujours (ERR_CONNECTION_REFUSED).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim()
  || (isLocalBrowser ? 'http://localhost:5000' : undefined);

export const SocketProvider = ({ children }) => {
  const { user } = useUser();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    if (socketRef.current?.connected) return;

    let active = true;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => { if (active) setConnected(true); });
    socket.on('disconnect', () => { if (active) setConnected(false); });

    socketRef.current = socket;
    return () => {
      active = false;
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const getSocket = useCallback(() => socketRef.current, []);

  return (
    <SocketContext.Provider value={{ getSocket, connected, unreadCount, setUnreadCount }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
