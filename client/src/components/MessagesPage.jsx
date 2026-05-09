import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/axiosConfig';
import './MessagesPage.css';

function Avatar({ nom, photo, size = 40 }) {
  const initial = (nom || '?')[0].toUpperCase();
  return photo
    ? <img src={photo} alt={nom} className="mp-avatar mp-avatar--img" style={{ width: size, height: size }} />
    : <span className="mp-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>{initial}</span>;
}

function ConversationItem({ conv, active, onClick }) {
  return (
    <button className={`mp-conv-item ${active ? 'mp-conv-item--active' : ''}`} onClick={onClick}>
      <Avatar nom={conv.otherNom} photo={conv.otherPhoto} />
      <div className="mp-conv-body">
        <span className="mp-conv-name">{conv.otherNom}</span>
        <span className="mp-conv-last">{conv.lastMessage || '…'}</span>
      </div>
      {conv.unread > 0 && <span className="mp-badge">{conv.unread}</span>}
    </button>
  );
}

export default function MessagesPage() {
  const { user } = useUser();
  const { getSocket, setUnreadCount } = useSocket();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(searchParams.get('with') || null);
  const [activeNom, setActiveNom] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef(null);

  const myId = user?.id || user?._id;

  // Charger la liste des conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/chat/conversations/list');
      setConversations(res.data.conversations || []);
    } catch { /* ignore */ }
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Si ?with=userId dans l'URL, ouvrir directement cette conversation
  useEffect(() => {
    const withId = searchParams.get('with');
    const withNom = searchParams.get('nom') || '';
    if (withId) { setActiveId(withId); setActiveNom(withNom); }
  }, [searchParams]);

  // Charger l'historique de la conversation active
  const loadMessages = useCallback(async (otherId) => {
    if (!otherId) return;
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/conversation/${otherId}`);
      setMessages(res.data.messages || []);
      // Marquer comme lu
      await api.post(`/chat/read/${otherId}`).catch(() => {});
      setConversations(prev =>
        prev.map(c => c.otherUserId === otherId ? { ...c, unread: 0 } : c)
      );
    } catch { /* ignore */ }
    finally { setLoadingMsgs(false); }
  }, []);

  useEffect(() => {
    loadMessages(activeId);
    // Re-fetch total unread from server when opening a conversation
    if (activeId) {
      api.get('/chat/unread/count')
        .then(res => setUnreadCount(res.data.count || 0))
        .catch(() => {});
    }
  }, [activeId, loadMessages, setUnreadCount]);

  // Scroll automatique en bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (msg) => {
      const isCurrentConv =
        (msg.sender === activeId && msg.receiver === myId) ||
        (msg.sender === myId && msg.receiver === activeId);

      if (isCurrentConv) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Marquer lu si c'est l'autre qui envoie
        if (msg.sender === activeId) {
          api.post(`/chat/read/${activeId}`).catch(() => {});
        }
      }

      // Mettre à jour la liste des conversations
      setConversations(prev => {
        const otherId = msg.sender === myId ? msg.receiver : msg.sender;
        const existing = prev.find(c => c.otherUserId === otherId);
        const updated = existing
          ? prev.map(c => c.otherUserId === otherId
              ? { ...c, lastMessage: msg.texte, lastAt: msg.date, unread: isCurrentConv ? 0 : c.unread + 1 }
              : c)
          : [{ otherUserId: otherId, otherNom: '…', otherPhoto: null, lastMessage: msg.texte, lastAt: msg.date, unread: 1 }, ...prev];
        return updated.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
      });
    };

    socket.on('new_message', handleNew);
    return () => socket.off('new_message', handleNew);
  }, [getSocket, activeId, myId]);

  const sendMessage = () => {
    if (!text.trim() || !activeId) return;
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', { receiverId: activeId, texte: text.trim() });
    } else {
      // Fallback REST
      api.post('/chat/send', { receiverId: activeId, texte: text.trim(), produitId: null })
        .then(res => setMessages(prev => [...prev, res.data.message]))
        .catch(() => {});
    }
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const openConv = (conv) => {
    setActiveId(conv.otherUserId);
    setActiveNom(conv.otherNom);
  };

  if (!user) return <div className="mp-empty">Connectez-vous pour accéder à vos messages.</div>;

  return (
    <div className="mp-root">
      {/* Sidebar conversations */}
      <aside className="mp-sidebar">
        <h2 className="mp-sidebar__title">Messages</h2>
        {loadingConvs
          ? <p className="mp-sidebar__hint">Chargement…</p>
          : conversations.length === 0
            ? <p className="mp-sidebar__hint">Aucune conversation.</p>
            : conversations.map(c => (
                <ConversationItem
                  key={c.otherUserId}
                  conv={c}
                  active={c.otherUserId === activeId}
                  onClick={() => openConv(c)}
                />
              ))}
      </aside>

      {/* Zone de chat */}
      <main className="mp-chat">
        {!activeId ? (
          <div className="mp-chat__empty">
            <span>💬</span>
            <p>Sélectionnez une conversation</p>
          </div>
        ) : (
          <>
            <div className="mp-chat__header">
              <Avatar nom={activeNom} photo={conversations.find(c => c.otherUserId === activeId)?.otherPhoto} size={36} />
              <span className="mp-chat__header-name">{activeNom || '…'}</span>
            </div>

            <div className="mp-chat__messages">
              {loadingMsgs
                ? <p className="mp-chat__hint">Chargement…</p>
                : messages.length === 0
                  ? <p className="mp-chat__hint">Aucun message. Commencez la conversation !</p>
                  : messages.map(msg => {
                      const isMine = msg.sender === myId;
                      return (
                        <div key={msg.id} className={`mp-msg ${isMine ? 'mp-msg--mine' : 'mp-msg--theirs'}`}>
                          <p className="mp-msg__text">{msg.texte}</p>
                          <span className="mp-msg__time">
                            {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
              <div ref={bottomRef} />
            </div>

            <div className="mp-chat__input-row">
              <textarea
                className="mp-chat__input"
                placeholder="Votre message…"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button className="mp-chat__send" onClick={sendMessage} disabled={!text.trim()}>
                ➤
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
