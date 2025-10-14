import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProfilUtilisateur.css';

const ProfilUtilisateur = () => {
  const [utilisateur, setUtilisateur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState(false);
  const [formData, setFormData] = useState({});
  const [statistiques, setStatistiques] = useState({});

  useEffect(() => {
    // Données mockées - à remplacer par votre API
    const mockUtilisateur = {
      id: 1,
      nom: 'Jean Dupont',
      email: 'jean.dupont@agriculteur.fr',
      telephone: '+33 6 12 34 56 78',
      adresse: {
        rue: '123 Rue de la Ferme',
        codePostal: '75000',
        ville: 'Paris',
        pays: 'France'
      },
      ferme: {
        nom: 'Ferme Bio Dupont',
        description: 'Spécialisée dans les légumes biologiques et les fruits de saison',
        superficie: '25 hectares',
        type: 'Agriculture Biologique',
        anneeCreation: 2010
      },
      avatar: '👨‍🌾',
      dateInscription: '2023-05-15',
      statut: 'Actif',
      specialites: ['Légumes Bio', 'Fruits', 'Produits Laitiers']
    };

    const mockStats = {
      produitsActifs: 12,
      commandesMois: 45,
      clientsAbonnes: 128,
      revenuMois: 3250,
      satisfaction: 4.8
    };

    setTimeout(() => {
      setUtilisateur(mockUtilisateur);
      setFormData(mockUtilisateur);
      setStatistiques(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdresseChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      adresse: {
        ...prev.adresse,
        [name]: value
      }
    }));
  };

  const handleFermeChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      ferme: {
        ...prev.ferme,
        [name]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ici, vous enverriez les données à votre API
    setUtilisateur(formData);
    setEdition(false);
    // Simuler une sauvegarde
    alert('Profil mis à jour avec succès !');
  };

  const handleAnnuler = () => {
    setFormData(utilisateur);
    setEdition(false);
  };

  const ajouterSpecialite = () => {
    const nouvelleSpecialite = prompt('Entrez une nouvelle spécialité:');
    if (nouvelleSpecialite && nouvelleSpecialite.trim() !== '') {
      setFormData(prev => ({
        ...prev,
        specialites: [...prev.specialites, nouvelleSpecialite.trim()]
      }));
    }
  };

  const supprimerSpecialite = (index) => {
    setFormData(prev => ({
      ...prev,
      specialites: prev.specialites.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="profil-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profil-container">
      <div className="profil-header">
        <h1>Mon Profil Agriculteur</h1>
        <p className="sous-titre">Gérez vos informations personnelles et votre ferme</p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>{statistiques.produitsActifs}</h3>
            <p>Produits actifs</p>
          </div>
          <div className="stat-gradient"></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{statistiques.clientsAbonnes}</h3>
            <p>Clients abonnés</p>
          </div>
          <div className="stat-gradient"></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>{statistiques.satisfaction}</h3>
            <p>Satisfaction clients</p>
          </div>
          <div className="stat-gradient"></div>
        </div>
      </div>

      <div className="profil-content">
        {/* Informations personnelles */}
        <div className="profil-section">
          <div className="section-header">
            <h2>Informations Personnelles</h2>
            {!edition && (
              <button 
                className="btn-editer"
                onClick={() => setEdition(true)}
              >
                <span className="btn-icon">✏️</span>
                Modifier le profil
              </button>
            )}
          </div>

          {!edition ? (
            <div className="info-display">
              <div className="avatar-section">
                <div className="avatar-large">
                  {utilisateur.avatar}
                </div>
                <div className="avatar-info">
                  <h3>{utilisateur.nom}</h3>
                  <p className="statut-badge">🟢 {utilisateur.statut}</p>
                  <p className="date-inscription">
                    Membre depuis {new Date(utilisateur.dateInscription).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">📧 Email:</span>
                  <span className="info-value">{utilisateur.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📞 Téléphone:</span>
                  <span className="info-value">{utilisateur.telephone}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📍 Adresse:</span>
                  <span className="info-value">
                    {utilisateur.adresse.rue}, {utilisateur.adresse.codePostal} {utilisateur.adresse.ville}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="form-edition">
              <div className="form-group">
                <label>Nom complet</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-section">
                <h4>Adresse</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Rue</label>
                    <input
                      type="text"
                      name="rue"
                      value={formData.adresse.rue}
                      onChange={handleAdresseChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Code Postal</label>
                    <input
                      type="text"
                      name="codePostal"
                      value={formData.adresse.codePostal}
                      onChange={handleAdresseChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ville</label>
                    <input
                      type="text"
                      name="ville"
                      value={formData.adresse.ville}
                      onChange={handleAdresseChange}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Informations de la ferme */}
        <div className="profil-section">
          <div className="section-header">
            <h2>Informations de la Ferme</h2>
          </div>

          {!edition ? (
            <div className="info-display">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">🏠 Nom de la ferme:</span>
                  <span className="info-value">{utilisateur.ferme.nom}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📝 Description:</span>
                  <span className="info-value">{utilisateur.ferme.description}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📏 Superficie:</span>
                  <span className="info-value">{utilisateur.ferme.superficie}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">🌱 Type:</span>
                  <span className="info-value">{utilisateur.ferme.type}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📅 Année de création:</span>
                  <span className="info-value">{utilisateur.ferme.anneeCreation}</span>
                </div>
              </div>

              <div className="specialites-section">
                <h4>Spécialités</h4>
                <div className="specialites-list">
                  {utilisateur.specialites.map((specialite, index) => (
                    <span key={index} className="specialite-badge">
                      {specialite}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="form-edition">
              <div className="form-group">
                <label>Nom de la ferme</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.ferme.nom}
                  onChange={handleFermeChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.ferme.description}
                  onChange={handleFermeChange}
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Superficie</label>
                  <input
                    type="text"
                    name="superficie"
                    value={formData.ferme.superficie}
                    onChange={handleFermeChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Type d'agriculture</label>
                  <input
                    type="text"
                    name="type"
                    value={formData.ferme.type}
                    onChange={handleFermeChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Année de création</label>
                  <input
                    type="number"
                    name="anneeCreation"
                    value={formData.ferme.anneeCreation}
                    onChange={handleFermeChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>Spécialités</h4>
                <div className="specialites-edit">
                  <div className="specialites-list">
                    {formData.specialites.map((specialite, index) => (
                      <span key={index} className="specialite-badge editable">
                        {specialite}
                        <button 
                          type="button"
                          onClick={() => supprimerSpecialite(index)}
                          className="btn-supprimer-specialite"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={ajouterSpecialite}
                    className="btn-ajouter-specialite"
                  >
                    + Ajouter une spécialité
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {edition && (
          <div className="actions-section">
            <button type="submit" onClick={handleSubmit} className="btn-sauvegarder">
              <span className="btn-icon">💾</span>
              Sauvegarder les modifications
            </button>
            <button type="button" onClick={handleAnnuler} className="btn-annuler">
              <span className="btn-icon">↶</span>
              Annuler
            </button>
          </div>
        )}

        {/* Section sécurité */}
        <div className="profil-section">
          <div className="section-header">
            <h2>Sécurité et Compte</h2>
          </div>
          <div className="security-actions">
            <button className="btn-security">
              <span className="btn-icon">🔒</span>
              Changer le mot de passe
            </button>
            <button className="btn-security">
              <span className="btn-icon">📧</span>
              Paramètres de notification
            </button>
            <button className="btn-security">
              <span className="btn-icon">📱</span>
              Applications connectées
            </button>
            <button className="btn-security danger">
              <span className="btn-icon">🚫</span>
              Désactiver le compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilUtilisateur;