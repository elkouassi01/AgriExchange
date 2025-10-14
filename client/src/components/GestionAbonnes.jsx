import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './GestionAbonnes.css';

const GestionAbonnes = () => {
  const [abonnes, setAbonnes] = useState([]);
  const [statistiques, setStatistiques] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('tous');

  useEffect(() => {
    // Données mockées - à remplacer par votre API
    const mockAbonnes = [
      {
        id: 1,
        nom: 'Marie Dubois',
        email: 'marie.dubois@email.com',
        telephone: '+33 6 12 34 56 78',
        dateAbonnement: '2024-01-15',
        statut: 'actif',
        produitsConsultes: 12,
        derniereVisite: '2024-01-20',
        localisation: 'Paris',
        avatar: '👩‍💼'
      },
      {
        id: 2,
        nom: 'Pierre Martin',
        email: 'pierre.martin@email.com',
        telephone: '+33 6 23 45 67 89',
        dateAbonnement: '2024-01-10',
        statut: 'actif',
        produitsConsultes: 8,
        derniereVisite: '2024-01-19',
        localisation: 'Lyon',
        avatar: '👨‍💼'
      },
      {
        id: 3,
        nom: 'Sophie Lambert',
        email: 'sophie.lambert@email.com',
        telephone: '+33 6 34 56 78 90',
        dateAbonnement: '2023-12-20',
        statut: 'inactif',
        produitsConsultes: 3,
        derniereVisite: '2024-01-05',
        localisation: 'Marseille',
        avatar: '👩‍🎨'
      },
      {
        id: 4,
        nom: 'Thomas Moreau',
        email: 'thomas.moreau@email.com',
        telephone: '+33 6 45 67 89 01',
        dateAbonnement: '2024-01-18',
        statut: 'actif',
        produitsConsultes: 15,
        derniereVisite: '2024-01-20',
        localisation: 'Bordeaux',
        avatar: '👨‍🔬'
      }
    ];

    const stats = {
      total: mockAbonnes.length,
      actifs: mockAbonnes.filter(a => a.statut === 'actif').length,
      inactifs: mockAbonnes.filter(a => a.statut === 'inactif').length,
      totalConsultations: mockAbonnes.reduce((sum, abonne) => sum + abonne.produitsConsultes, 0),
      moyenneConsultations: Math.round(mockAbonnes.reduce((sum, abonne) => sum + abonne.produitsConsultes, 0) / mockAbonnes.length)
    };

    setTimeout(() => {
      setAbonnes(mockAbonnes);
      setStatistiques(stats);
      setLoading(false);
    }, 1500);
  }, []);

  const abonnesFiltres = abonnes.filter(abonne => {
    if (filtre === 'tous') return true;
    return abonne.statut === filtre;
  });

  const getStatutClass = (statut) => {
    return statut === 'actif' ? 'statut-actif' : 'statut-inactif';
  };

  const getNiveauEngagement = (consultations) => {
    if (consultations >= 10) return { text: 'Élevé', class: 'engagement-eleve' };
    if (consultations >= 5) return { text: 'Moyen', class: 'engagement-moyen' };
    return { text: 'Faible', class: 'engagement-faible' };
  };

  if (loading) {
    return (
      <div className="abonnes-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de vos abonnés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="abonnes-container">
      <div className="abonnes-header">
        <h1>Gestion des Abonnés</h1>
        <p className="sous-titre">Suivez les consommateurs intéressés par vos produits</p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{statistiques.total}</h3>
            <p>Abonnés total</p>
          </div>
          <div className="stat-gradient"></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{statistiques.actifs}</h3>
            <p>Abonnés actifs</p>
          </div>
          <div className="stat-gradient"></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{statistiques.totalConsultations}</h3>
            <p>Produits consultés</p>
          </div>
          <div className="stat-gradient"></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{statistiques.moyenneConsultations}</h3>
            <p>Moyenne par abonné</p>
          </div>
          <div className="stat-gradient"></div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filtres-section">
        <div className="filtres-group">
          <button 
            className={`filtre-btn ${filtre === 'tous' ? 'active' : ''}`}
            onClick={() => setFiltre('tous')}
          >
            Tous ({statistiques.total})
          </button>
          <button 
            className={`filtre-btn ${filtre === 'actif' ? 'active' : ''}`}
            onClick={() => setFiltre('actif')}
          >
            Actifs ({statistiques.actifs})
          </button>
          <button 
            className={`filtre-btn ${filtre === 'inactif' ? 'active' : ''}`}
            onClick={() => setFiltre('inactif')}
          >
            Inactifs ({statistiques.inactifs})
          </button>
        </div>
      </div>

      {/* Liste des abonnés */}
      <div className="abonnes-grid">
        {abonnesFiltres.map(abonne => {
          const engagement = getNiveauEngagement(abonne.produitsConsultes);
          
          return (
            <div key={abonne.id} className="abonne-card">
              <div className="abonne-header">
                <div className="abonne-avatar">
                  {abonne.avatar}
                </div>
                <div className="abonne-info">
                  <h3>{abonne.nom}</h3>
                  <span className={`statut-badge ${getStatutClass(abonne.statut)}`}>
                    {abonne.statut === 'actif' ? '🟢 Actif' : '🔴 Inactif'}
                  </span>
                </div>
              </div>

              <div className="abonne-details">
                <div className="detail-item">
                  <span className="detail-label">📧 Email:</span>
                  <span className="detail-value">{abonne.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">📞 Téléphone:</span>
                  <span className="detail-value">{abonne.telephone}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">📍 Localisation:</span>
                  <span className="detail-value">{abonne.localisation}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">📅 Abonné depuis:</span>
                  <span className="detail-value">
                    {new Date(abonne.dateAbonnement).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="abonne-metrics">
                <div className="metric">
                  <span className="metric-label">Produits consultés:</span>
                  <span className="metric-value">{abonne.produitsConsultes}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Dernière visite:</span>
                  <span className="metric-value">
                    {new Date(abonne.derniereVisite).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Engagement:</span>
                  <span className={`metric-value ${engagement.class}`}>
                    {engagement.text}
                  </span>
                </div>
              </div>

              <div className="abonne-actions">
                <button className="btn-message">
                  <span className="btn-icon">💬</span>
                  Message
                </button>
                <button className="btn-details">
                  <span className="btn-icon">👁️</span>
                  Détails
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {abonnesFiltres.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>Aucun abonné trouvé</h3>
          <p>Vous n'avez pas encore d'abonnés correspondant à ce filtre</p>
          <Link to="/mes-produits" className="btn-primary">
            Voir mes produits
          </Link>
        </div>
      )}
    </div>
  );
};

export default GestionAbonnes;