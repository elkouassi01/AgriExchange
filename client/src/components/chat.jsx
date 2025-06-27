import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css'; // à créer pour le style

const SOCKET_SERVER_URL = 'http://localhost:5000'; // adapte selon ton backend

const Chat = ({ productId, agriculteurId, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef();
  const messagesEndRef = useRef();

  useEffect(() => {
    // Connecte au serveur WebSocket
    socketRef.current = io(SOCKET_SERVER_URL, {
      query: { productId, userId: user.id },
    });

    // Reçoit les messages initiaux (historique)
    socketRef.current.on('initMessages', (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });

    // Reçoit un message en temps réel
    socketRef.current.on('newMessage', (message) => {
      setMessages((prevMsgs) => [...prevMsgs, message]);
      scrollToBottom();
    });

    // Nettoyage à la fermeture du composant
    return () => {
      socketRef.current.disconnect();
    };
  }, [productId, user.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    const messageData = {
      senderId: user.id,
      senderName: user.nom || user.email || 'Utilisateur',
      text: input,
      timestamp: new Date().toISOString(),
    };

    // Envoi message via Socket.IO
    socketRef.current.emit('sendMessage', { productId, agriculteurId, message: messageData });

    // Ajout immédiat côté client pour UX
    setMessages((prev) => [...prev, messageData]);
    setInput('');
    scrollToBottom();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <h4>Discussion avec l'agriculteur</h4>
      <div className="chat-messages" >
        {messages.length === 0 && <p>Aucun message pour l'instant</p>}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message ${msg.senderId === user.id ? 'my-message' : 'other-message'}`}
          >
            <div className="message-meta">
              <strong>{msg.senderName}</strong> <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <textarea
        className="chat-input"
        placeholder="Écrire un message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        rows={3}
      />
      <button className="chat-send-btn" onClick={handleSendMessage}>
        Envoyer
      </button>
    </div>
  );
};

export default Chat;
