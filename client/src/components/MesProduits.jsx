import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MesProduits.css';

const MesProduits = () => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Données mockées - à remplacer par votre API
  useEffect(() => {
    const mockProduits = [
      {
        id: 1,
        nom: 'Tomates Bio',
        categorie: 'Légumes',
        prix: 3.50,
        quantite: 50,
        unite: 'kg',
        statut: 'Disponible',
        image: '🍅',
        dateAjout: '2024-01-15'
      },
      {
        id: 2,
        nom: 'Pommes Golden',
        categorie: 'Fruits',
        prix: 2.80,
        quantite: 30,
        unite: 'kg',
        statut: 'Bientôt épuisé',
        image: '🍎',
        dateAjout: '2024-01-10'
      },
      {
        id: 3,
        nom: 'Carottes',
        categorie: 'Légumes',
        prix: 2.20,
        quantite: 0,
        unite: 'kg',
        statut: 'Épuisé',
        image: '🥕',
        dateAjout: '2024-01-08'
      }
    ];

    setTimeout(() => {
      setProduits(mockProduits);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatutClass = (statut) => {
    switch(statut) {
      case 'Disponible': return 'statut-disponible';
      case 'Bientôt épuisé': return 'statut-bientot-epuise';
      case 'Épuisé': return 'statut-epuise';
      default: return 'statut-default';
    }
  };

  if (loading) {
    return (
      <div className="produits-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de vos produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="produits-container">
      <div className="produits-header">
        <h1>Mes Produits</h1>
        <Link to="/ajouter-produit" className="btn-ajouter">
          <span className="btn-icon">+</span>
          Ajouter un produit
        </Link>
      </div>

      <div className="produits-stats">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>{produits.length}</h3>
            <p>Produits total</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{produits.filter(p => p.statut === 'Disponible').length}</h3>
            <p>Disponibles</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{produits.filter(p => p.statut === 'Bientôt épuisé').length}</h3>
            <p>Bientôt épuisés</p>
          </div>
        </div>
      </div>

      <div className="produits-grid">
        {produits.map(produit => (
          <div key={produit.id} className="produit-card">
            <div className="produit-header">
              <div className="produit-image">{produit.image}</div>
              <div className="produit-titre">
                <h3>{produit.nom}</h3>
                <span className="produit-categorie">{produit.categorie}</span>
              </div>
            </div>
            
            <div className="produit-info">
              <div className="info-row">
                <span className="info-label">Prix:</span>
                <span className="info-value">{produit.prix}€/{produit.unite}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Quantité:</span>
                <span className="info-value">{produit.quantite} {produit.unite}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Statut:</span>
                <span className={`info-value ${getStatutClass(produit.statut)}`}>
                  {produit.statut}
                </span>
              </div>
            </div>

            <div className="produit-actions">
              <button className="btn-modifier">
                <span className="btn-icon">✏️</span>
                Modifier
              </button>
              <button className="btn-supprimer">
                <span className="btn-icon">🗑️</span>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {produits.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>Aucun produit trouvé</h3>
          <p>Commencez par ajouter votre premier produit</p>
          <Link to="/ajouter-produit" className="btn-primary">
            Ajouter un produit
          </Link>
        </div>
      )}
    </div>
  );
};

export default MesProduits;