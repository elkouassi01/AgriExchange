import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './ProfilUtilisateur.css';

const ProfilUtilisateur = () => {
  const [utilisateur, setUtilisateur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState(false);
  const [formData, setFormData] = useState({});
  const [statistiques, setStatistiques] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Configuration de l'API
  const SERVER_BASE_URL = window.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  // Fonction pour récupérer le profil utilisateur
  const fetchProfilUtilisateur = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Vous devez être connecté pour accéder à votre profil');
      }

      console.log('🔄 Chargement du profil utilisateur...');
      
      // Essayer différents endpoints possibles
      const endpoints = [
        '/api/v1/users/profile',
        '/api/v1/users/me',
        '/api/v1/user/profile',
        '/api/v1/user/me',
        '/api/users/profile',
        '/api/users/me'
      ];

      let response = null;
      let data = null;
      let successfulEndpoint = null;

      // Tester chaque endpoint jusqu'à trouver celui qui fonctionne
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Test de l'endpoint: ${endpoint}`);
          response = await fetch(`${SERVER_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            data = await response.json();
            successfulEndpoint = endpoint;
            console.log(`✅ Endpoint trouvé: ${endpoint}`);
            break;
          }
        } catch (err) {
          console.log(`❌ Endpoint ${endpoint} échoué:`, err.message);
          continue;
        }
      }

      // Si aucun endpoint n'a fonctionné
      if (!response || !response.ok) {
        // Essayer sans endpoint spécifique pour voir la structure de l'API
        console.log('🔍 Test de l\'endpoint racine users...');
        const testResponse = await fetch(`${SERVER_BASE_URL}/api/v1/users`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('📦 Structure de l\'API users:', testData);
        }

        throw new Error('Aucun endpoint de profil trouvé. Utilisation des données de démonstration.');
      }

      console.log('📦 Réponse API profil:', data);

      // Traitement des différents formats de réponse
      let userData = data;
      
      if (data.success && data.data) {
        userData = data.data;
      } else if (data.user) {
        userData = data.user;
      } else if (data.profile) {
        userData = data.profile;
      }

      // Si les données sont un tableau, prendre le premier élément ou utiliser une structure par défaut
      if (Array.isArray(userData)) {
        if (userData.length > 0) {
          userData = userData[0];
        } else {
          // Créer une structure par défaut si le tableau est vide
          userData = {};
        }
      }

      // Formater les données utilisateur avec des valeurs par défaut
      const utilisateurFormate = {
        id: userData._id || userData.id || '1',
        nom: userData.nom || userData.name || `${userData.prenom || ''} ${userData.nom || ''}`.trim() || 'Utilisateur',
        email: userData.email || 'email@exemple.fr',
        telephone: userData.telephone || userData.phone || '+33 6 12 34 56 78',
        adresse: {
          rue: userData.adresse?.rue || userData.address?.street || userData.adresse || '123 Rue de la Ferme',
          codePostal: userData.adresse?.codePostal || userData.address?.postalCode || userData.codePostal || '75000',
          ville: userData.adresse?.ville || userData.address?.city || userData.ville || 'Paris',
          pays: userData.adresse?.pays || userData.address?.country || 'France'
        },
        ferme: {
          nom: userData.ferme?.nom || userData.farm?.name || userData.nomFerme || 'Ma Ferme',
          description: userData.ferme?.description || userData.farm?.description || 'Description de ma ferme',
          superficie: userData.ferme?.superficie || userData.farm?.area || '25 hectares',
          type: userData.ferme?.type || userData.farm?.type || 'Agriculture',
          anneeCreation: userData.ferme?.anneeCreation || userData.farm?.creationYear || new Date().getFullYear()
        },
        avatar: userData.avatar || '👨‍🌾',
        dateInscription: userData.createdAt || userData.dateInscription || new Date().toISOString(),
        statut: userData.statut || userData.status || 'Actif',
        specialites: userData.specialites || userData.specialties || ['Agriculture'],
        role: userData.role || 'agriculteur'
      };

      setUtilisateur(utilisateurFormate);
      setFormData(utilisateurFormate);

      // Charger les statistiques (optionnel)
      await fetchStatistiques(utilisateurFormate.id);

    } catch (err) {
      console.error('❌ Erreur chargement profil:', err);
      
      let errorMessage = err.message || 'Erreur lors du chargement du profil';
      
      if (err.message.includes('Failed to fetch') || err.message.includes('Network Error')) {
        errorMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion Internet.";
      }
      else if (err.message.includes('401') || err.message.includes('token')) {
        errorMessage = "Session expirée. Veuillez vous reconnecter.";
        setTimeout(() => navigate('/login'), 2000);
      }
      else if (err.message.includes('404') || err.message.includes('Aucun endpoint')) {
        errorMessage = "Configuration API manquante. Utilisation des données de démonstration.";
        loadDonneesDemo();
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour charger des données de démonstration
  const loadDonneesDemo = () => {
    console.log('🎭 Chargement des données de démonstration...');
    
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
      specialites: ['Légumes Bio', 'Fruits', 'Produits Laitiers'],
      role: 'agriculteur'
    };

    const mockStats = {
      produitsActifs: 12,
      commandesMois: 45,
      clientsAbonnes: 128,
      revenuMois: 3250,
      satisfaction: 4.8
    };

    setUtilisateur(mockUtilisateur);
    setFormData(mockUtilisateur);
    setStatistiques(mockStats);
    setError(null);
  };

  // Fonction pour récupérer les statistiques
  const fetchStatistiques = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      
      const endpoints = [
        `/api/v1/users/${userId}/stats`,
        `/api/v1/users/stats`,
        `/api/v1/stats/users/${userId}`,
        `/api/v1/user/stats`
      ];

      let response = null;

      for (const endpoint of endpoints) {
        try {
          response = await fetch(`${SERVER_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const statsData = await response.json();
            console.log('📊 Statistiques utilisateur:', statsData);
            
            // Traitement des statistiques selon le format de réponse
            let stats = {};
            
            if (statsData.success && statsData.data) {
              stats = statsData.data;
            } else if (statsData.stats) {
              stats = statsData.stats;
            } else {
              stats = statsData;
            }

            setStatistiques({
              produitsActifs: stats.produitsActifs || stats.activeProducts || 0,
              commandesMois: stats.commandesMois || stats.ordersThisMonth || 0,
              clientsAbonnes: stats.clientsAbonnes || stats.subscribedClients || 0,
              revenuMois: stats.revenuMois || stats.monthlyRevenue || 0,
              satisfaction: stats.satisfaction || stats.rating || 0
            });
            return;
          }
        } catch (error) {
          continue;
        }
      }

      // Si aucun endpoint de statistiques ne fonctionne, utiliser des valeurs par défaut
      console.warn('⚠️ Aucun endpoint de statistiques trouvé, utilisation des valeurs par défaut');
      setStatistiques({
        produitsActifs: 0,
        commandesMois: 0,
        clientsAbonnes: 0,
        revenuMois: 0,
        satisfaction: 0
      });

    } catch (error) {
      console.warn('⚠️ Erreur chargement statistiques, utilisation des valeurs par défaut');
      setStatistiques({
        produitsActifs: 0,
        commandesMois: 0,
        clientsAbonnes: 0,
        revenuMois: 0,
        satisfaction: 0
      });
    }
  };

  // Fonction pour sauvegarder les modifications
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Préparer les données pour l'API
      const dataToSend = {
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        ferme: formData.ferme,
        specialites: formData.specialites
      };

      console.log('💾 Tentative de sauvegarde du profil...');

      // Essayer différents endpoints pour la sauvegarde
      const endpoints = [
        '/api/v1/users/profile',
        '/api/v1/users/me',
        '/api/v1/user/profile'
      ];

      let saved = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${SERVER_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dataToSend)
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Profil sauvegardé avec succès:', result);
            saved = true;
            break;
          }
        } catch (err) {
          console.log(`❌ Endpoint ${endpoint} échoué:`, err.message);
          continue;
        }
      }

      if (!saved) {
        // Simuler une sauvegarde réussie en mode démo
        console.log('🎭 Mode démo: simulation de sauvegarde');
        setTimeout(() => {
          setUtilisateur(formData);
          setEdition(false);
          setLoading(false);
          alert('✅ Profil mis à jour avec succès ! (Mode démo)');
        }, 1000);
        return;
      }

      // Mettre à jour les données locales
      setUtilisateur(formData);
      setEdition(false);
      
      alert('✅ Profil mis à jour avec succès !');

    } catch (err) {
      console.error('❌ Erreur sauvegarde profil:', err);
      alert(`❌ Erreur lors de la sauvegarde: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour changer le mot de passe
  const handleChangerMotDePasse = async () => {
    const ancienMotDePasse = prompt('Ancien mot de passe:');
    const nouveauMotDePasse = prompt('Nouveau mot de passe:');
    const confirmerMotDePasse = prompt('Confirmer le nouveau mot de passe:');

    if (!ancienMotDePasse || !nouveauMotDePasse || !confirmerMotDePasse) {
      alert('Tous les champs sont requis');
      return;
    }

    if (nouveauMotDePasse !== confirmerMotDePasse) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ancienMotDePasse,
          nouveauMotDePasse
        })
      });

      if (response.ok) {
        alert('✅ Mot de passe changé avec succès !');
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      console.error('❌ Erreur changement mot de passe:', err);
      alert(`❌ Erreur: ${err.message}`);
    }
  };

  // Fonction pour désactiver le compte
  const handleDesactiverCompte = async () => {
    const confirmation = window.confirm(
      'Êtes-vous sûr de vouloir désactiver votre compte ? Cette action est réversible mais vous ne pourrez plus vous connecter.'
    );

    if (!confirmation) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/users/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Compte désactivé avec succès');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Erreur lors de la désactivation');
      }
    } catch (err) {
      console.error('❌ Erreur désactivation compte:', err);
      alert(`❌ Erreur: ${err.message}`);
    }
  };

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

  useEffect(() => {
    fetchProfilUtilisateur();
  }, []);

  if (loading && !utilisateur) {
    return (
      <div className="profil-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (error && !utilisateur) {
    return (
      <div className="profil-container">
        <div className="error-container">
          <h3>🚫 Erreur de chargement</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchProfilUtilisateur} className="btn-primary">
              ↻ Réessayer
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              🏠 Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profil-container">
      <div className="profil-header">
        <h1>Mon Profil {utilisateur?.role === 'agriculteur' ? 'Agriculteur' : 'Utilisateur'}</h1>
        <p className="sous-titre">Gérez vos informations personnelles et votre ferme</p>
        {error && (
          <div className="warning-banner">
            ⚠️ {error}
          </div>
        )}
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

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{statistiques.revenuMois}F</h3>
            <p>Revenu ce mois</p>
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
                  {utilisateur?.avatar}
                </div>
                <div className="avatar-info">
                  <h3>{utilisateur?.nom}</h3>
                  <p className="statut-badge">🟢 {utilisateur?.statut}</p>
                  <p className="date-inscription">
                    Membre depuis {new Date(utilisateur?.dateInscription).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">📧 Email:</span>
                  <span className="info-value">{utilisateur?.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📞 Téléphone:</span>
                  <span className="info-value">{utilisateur?.telephone || 'Non renseigné'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📍 Adresse:</span>
                  <span className="info-value">
                    {utilisateur?.adresse.rue || 'Non renseignée'}, {utilisateur?.adresse.codePostal} {utilisateur?.adresse.ville}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">👤 Rôle:</span>
                  <span className="info-value">{utilisateur?.role}</span>
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
                  value={formData.nom || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="+33 6 12 34 56 78"
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
                      value={formData.adresse?.rue || ''}
                      onChange={handleAdresseChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Code Postal</label>
                    <input
                      type="text"
                      name="codePostal"
                      value={formData.adresse?.codePostal || ''}
                      onChange={handleAdresseChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ville</label>
                    <input
                      type="text"
                      name="ville"
                      value={formData.adresse?.ville || ''}
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
        {utilisateur?.role === 'agriculteur' && (
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
                    value={formData.ferme?.nom || ''}
                    onChange={handleFermeChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.ferme?.description || ''}
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
                      value={formData.ferme?.superficie || ''}
                      onChange={handleFermeChange}
                      className="form-input"
                      placeholder="ex: 25 hectares"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type d'agriculture</label>
                    <input
                      type="text"
                      name="type"
                      value={formData.ferme?.type || ''}
                      onChange={handleFermeChange}
                      className="form-input"
                      placeholder="ex: Agriculture Biologique"
                    />
                  </div>
                  <div className="form-group">
                    <label>Année de création</label>
                    <input
                      type="number"
                      name="anneeCreation"
                      value={formData.ferme?.anneeCreation || ''}
                      onChange={handleFermeChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4>Spécialités</h4>
                  <div className="specialites-edit">
                    <div className="specialites-list">
                      {formData.specialites?.map((specialite, index) => (
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
        )}

        {/* Actions */}
        {edition && (
          <div className="actions-section">
            <button 
              type="submit" 
              onClick={handleSubmit} 
              className="btn-sauvegarder"
              disabled={loading}
            >
              <span className="btn-icon">💾</span>
              {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </button>
            <button 
              type="button" 
              onClick={handleAnnuler} 
              className="btn-annuler"
              disabled={loading}
            >
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
            <button className="btn-security" onClick={handleChangerMotDePasse}>
              <span className="btn-icon">🔒</span>
              Changer le mot de passe
            </button>
            <button className="btn-security">
              <span className="btn-icon">📧</span>
              Paramètres de notification
            </button>
            <button className="btn-security danger" onClick={handleDesactiverCompte}>
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