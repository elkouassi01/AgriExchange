// src/main.jsx ou src/index.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { UserProvider } from './contexts/UserContext';
import { CartProvider } from './contexts/CartContext';
import { SocketProvider } from './contexts/SocketContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <SocketProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </SocketProvider>
    </UserProvider>
  </StrictMode>
);
