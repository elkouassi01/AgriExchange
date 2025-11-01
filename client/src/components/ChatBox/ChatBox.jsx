import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useUser } from "../../contexts/UserContext";
import "./ChatBox.css";

const ChatBox = ({ produitId, autreUserId }) => {
  const { user } = useUser(); // Récupération de l'utilisateur connecté et token JWT
  const [messages, setMessages] = useState([]); // Tableau des messages affichés
  const [texte, setTexte] = useState(""); // Texte du message à envoyer
  const [loading, setLoading] = useState(false); // Indicateur d'envoi en cours
  const messagesEndRef = useRef(null); // Ref pour scroller automatiquement en bas

  // Charger les messages au montage du composant ou si produitId/autreUserId/token changent
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`/api/chat/${produitId}/${autreUserId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`, // Token JWT pour authentification
          },
        });
        setMessages(res.data.messages || []); // Mettre à jour la liste des messages
      } catch (err) {
        console.error("Erreur chargement messages:", err);
      }
    };

    if (produitId && autreUserId && user?.token) {
      fetchMessages();
    }
  }, [produitId, autreUserId, user]);

  // Scroll automatique vers le dernier message visible à chaque modification de la liste
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Fonction pour envoyer un message
  const handleSend = async () => {
    if (!texte.trim()) return; // Ne pas envoyer un message vide

    setLoading(true); // Activation du loader en attendant la réponse
    try {
      const res = await axios.post(
        "/api/chat/send",
        {
          produitId,
          receiverId: autreUserId,
          texte,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`, // Token JWT pour authentification
          },
        }
      );

      // Ajouter le message retourné par le backend à la liste des messages
      setMessages((prev) => [...prev, res.data.message || res.data]);
      setTexte(""); // Réinitialiser le champ texte
    } catch (err) {
      console.error("Erreur envoi message:", err);
      alert("Erreur lors de l'envoi du message.");
    } finally {
      setLoading(false); // Désactivation du loader
    }
  };

  // Envoi du message à l'appui de la touche Enter (sans shift)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Empêche saut de ligne
      handleSend();
    }
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">Discussion avec le vendeur</div>

      <div className="chatbox-messages">
        {messages.length === 0 && (
          <p className="chatbox-empty">Aucun message pour l'instant.</p>
        )}
        {messages.map((msg, index) => (
          <div
            key={msg._id || index}
            className={`chatbox-message ${
              msg.sender === user._id
                ? "chatbox-message-sent"
                : "chatbox-message-received"
            }`}
          >
            <div className="chatbox-message-text">{msg.texte}</div>
            <div className="chatbox-message-date">
              {new Date(msg.date).toLocaleString("fr-FR")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbox-input-container">
        <textarea
          placeholder="Votre message..."
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="chatbox-textarea"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={loading || !texte.trim()}
          className="chatbox-send-button"
          aria-label="Envoyer message"
          title="Envoyer message"
        >
          {loading ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
