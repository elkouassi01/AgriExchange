import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './ProductDetail.css';

// 🖼️ Image par défaut si l'image du produit est manquante
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

/**
 * 💬 Composant de chat avec l'agriculteur
 */
const Chat = ({ productId, agriculteurId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    setInput('');
  };

  return (
    <div className="chat-container">
      <h4>Discussion avec l'agriculteur</h4>
      <div className="chat-messages">
        {messages.length === 0 && <p>Aucun message pour l'instant.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.sender}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Écrire un message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Envoyer</button>
      </div>
    </div>
  );
};

/**
 * Formate un montant en FCFA
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté avec le symbole FCFA
 */
const formatFCFA = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount) + ' FCFA';
};

/**
 * 🛒 Composant principal : détail d'un produit
 */
function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showChat, setShowChat] = useState(false);

  // ✅ Base URL du serveur
  const SERVER_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchProduit = async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorDetails(null);

        // 🔍 Vérification de l'ID MongoDB
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          setError("ID de produit invalide");
          setErrorDetails({
            message: "L'identifiant doit être une chaîne hexadécimale de 24 caractères",
            received: id,
            expected: "Format MongoDB ObjectId",
          });
          setLoading(false);
          return;
        }

        // 🔐 Préparation des headers
        const headers = user?.token
          ? {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            }
          : {};

        // 📡 Appel API
        const res = await fetch(`${SERVER_BASE_URL}/api/v1/products/${id}`, { headers });

        if (!res.ok) {
          let message = `Erreur ${res.status}`;
          try {
            const json = await res.json();
            if (json.message) message += ` : ${json.message}`;
            setError(message);
            setErrorDetails(json);
          } catch {
            const text = await res.text();
            message += text ? ` : ${text}` : '';
            setError(message);
          }
          setLoading(false);
          return;
        }

        // ✅ Traitement des données
        const data = await res.json();
        
        // Supporte les deux formats de réponse
        const product = data.product || data;
        
        if (!product || !product._id) {
          setError("Produit introuvable dans la réponse");
          setErrorDetails({ response: data });
          setLoading(false);
          return;
        }

        // 💰 CORRECTION: Format du prix en FCFA
        const prixFormatte = `${formatFCFA(product.prix)} / ${product.unite || 'kg'}`;

        // 🖼️ Gestion des images
        let imageUrl = product.imageUrl || DEFAULT_IMAGE;
        
        // Correction des URLs d'images
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:')) {
          if (imageUrl.startsWith('/uploads/')) {
            imageUrl = `${SERVER_BASE_URL}${imageUrl}`;
          } else if (!imageUrl.startsWith('/')) {
            imageUrl = `${SERVER_BASE_URL}/uploads/${imageUrl}`;
          } else {
            imageUrl = `${SERVER_BASE_URL}${imageUrl}`;
          }
        }

        // 📥 Mise à jour du produit
        setProduit({
          ...product,
          prix: prixFormatte,
          imageUrl,
          categorie: product.categorie || 'Non classé',
          // CORRECTION: sellerId devient vendeur pour la compatibilité
          vendeur: product.sellerId || product.vendeur
        });
      } catch (err) {
        if (err.message.includes("Failed to fetch")) {
          setError("Erreur réseau: Impossible de contacter le serveur");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduit();
  }, [id, user, SERVER_BASE_URL]);

  const retryLoading = () => {
    setError(null);
    setErrorDetails(null);
    setLoading(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des détails du produit...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Erreur de chargement</h3>
        <p className="error-message">{error}</p>
        {errorDetails && (
          <div className="error-details">
            {errorDetails.message && <p>{errorDetails.message}</p>}
            {errorDetails.received && (
              <p><strong>ID reçu :</strong> {errorDetails.received}</p>
            )}
          </div>
        )}
        <div className="error-actions">
          <button onClick={retryLoading}>Réessayer</button>
          <button onClick={() => navigate('/categories')}>Retour aux catégories</button>
          <button onClick={() => navigate('/')}>Accueil</button>
        </div>
      </div>
    );
  }

  if (!produit) {
    return (
      <div className="not-found-container">
        <h3>Produit introuvable</h3>
        <p>Le produit demandé n'existe pas ou a été supprimé.</p>
        <button onClick={() => navigate('/categories')}>Voir tous les produits</button>
        <button onClick={() => navigate(-1)}>Retour</button>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <div className="product-detail-grid">
        {/* Image produit + bouton contact */}
        <div className="product-image-section">
          <div className="image-container">
            <img
              src={produit.imageUrl}
              alt={produit.nom}
              className="product-detail-image"
              onError={(e) => {
                console.error('Erreur de chargement de l\'image:', e.target.src);
                e.target.onerror = null;
                e.target.src = DEFAULT_IMAGE;
                e.target.classList.add("default-image");
              }}
            />
          </div>
          
          {user?.role === 'consommateur' && (
            <button
              className="contact-button"
              onClick={() => setShowChat(!showChat)}
            >
              {showChat ? 'Fermer le chat' : 'Contacter l\'agriculteur'}
            </button>
          )}
        </div>

        {/* Infos produit */}
        <div className="product-info-section">
          <h1>{produit.nom}</h1>
          
          {/* Informations de debug */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-info">
              <p><strong>ID produit:</strong> {id}</p>
              <p><strong>URL image:</strong> {produit.imageUrl}</p>
            </div>
          )}
          
          <div className="product-meta">
            <p><strong>Catégorie:</strong> {produit.categorie}</p>
            <p><strong>Prix:</strong> {produit.prix}</p>
            {produit.stock !== undefined && (
              <p><strong>Stock disponible:</strong> {produit.stock}</p>
            )}
            {produit.vendeur?.nom && (
              <p><strong>Vendeur:</strong> {produit.vendeur.nom}</p>
            )}
            {produit.dateRecolte && (
              <p><strong>Date de récolte:</strong> {new Date(produit.dateRecolte).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          
          <div className="product-description">
            <h3>Description</h3>
            <p>{produit.description || 'Aucune description fournie.'}</p>
          </div>
          
          {produit.mensurations && (
            <div className="product-features">
              <h3>Mensurations</h3>
              <p>{produit.mensurations}</p>
            </div>
          )}
          
          {produit.tags && produit.tags.length > 0 && (
            <div className="product-tags">
              <h3>Tags</h3>
              <div className="tags-container">
                {produit.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat si visible */}
      {showChat && (
        <Chat 
          productId={produit._id} 
          agriculteurId={produit.vendeur?._id} 
        />
      )}

      <div className="navigation-buttons">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Retour aux produits
        </button>
        <button onClick={() => window.scrollTo(0, 0)} className="top-button">
          ↑ Haut de page
        </button>
      </div>
    </div>
  );
}

export default ProductDetail;