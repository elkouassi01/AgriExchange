const User = require('../models/User');
const ProductView = require('../models/ProductView'); // Nouveau modèle
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const moment = require('moment');

/**
 * 🔐 Connexion utilisateur
 * Route: POST /api/v1/users/login
 */
exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  try {
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: "Mot de passe invalide" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Mettre à jour la dernière connexion
    user.derniereConnexion = new Date();
    await user.save();

    // Exclure le mot de passe de la réponse
    const userData = user.toObject();
    delete userData.motDePasse;

    return res.status(200).json({
      message: "Connexion réussie",
      user: userData,
      token,
    });
  } catch (err) {
    console.error('❌ Erreur login :', err);
    return res.status(500).json({ message: "Erreur serveur lors de la connexion" });
  }
};

/**
 * 🎫 GET /users/:id/forfait
 * Récupère les informations d'abonnement et de vues
 */
exports.getUserForfait = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier le rôle
    if (user.role !== 'consommateur') {
      return res.status(403).json({ message: 'Accès réservé aux consommateurs' });
    }

    const abonnement = user.abonnement || {};
    const formule = abonnement.formule || null;
    const dateFin = abonnement.dateFin ? new Date(abonnement.dateFin) : null;
    
    // Vérifier si l'abonnement est actif
    const abonnementActif = abonnement.statut === 'actif' && 
                            dateFin && 
                            dateFin > new Date();

    // Calculer les jours restants
    const joursRestants = dateFin ? Math.ceil((dateFin - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    // Récupérer les vues du mois en cours
    const vuesCeMois = abonnement.vuesUtilisees || 0;

    // Déterminer le quota selon la formule
    const quotas = {
      BLEU: 1,
      GOLD: 5,
      PLATINUM: Infinity
    };
    const quotaTotal = formule ? quotas[formule] || 0 : 0;
    
    // Calculer les vues restantes
    const quotaRestant = quotaTotal === Infinity 
      ? Infinity 
      : Math.max(0, quotaTotal - vuesCeMois);

    return res.status(200).json({
      abonnement: {
        formule,
        dateDebut: abonnement.dateDebut,
        dateFin: abonnement.dateFin,
        montant: abonnement.montant,
        statut: abonnement.statut,
        joursRestants,
        vuesUtilisees: vuesCeMois,
        vuesRestantes: quotaRestant,
        quotaTotal
      },
      abonnementActif
    });
  } catch (err) {
    console.error('❌ Erreur getUserForfait :', err);
    return res.status(500).json({ 
      message: 'Erreur interne serveur',
      error: err.message
    });
  }
};

/**
 * 📊 POST /users/:id/consume-view
 * Enregistre une vue produit
 */
exports.enregistrerVueProduit = async (req, res) => {
  try {
    const userId = req.params.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'ID produit manquant' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier le rôle
    if (user.role !== 'consommateur') {
      return res.status(403).json({ message: 'Action réservée aux consommateurs' });
    }

    // Vérifier si l'abonnement permet une nouvelle vue
    const abonnement = user.abonnement || {};
    const formule = abonnement.formule;
    
    // Déterminer le quota selon la formule
    const quotas = {
      BLEU: 1,
      GOLD: 5,
      PLATINUM: Infinity
    };
    const quotaTotal = formule ? quotas[formule] || 0 : 0;
    
    // Vérifier si le quota est atteint
    if (quotaTotal !== Infinity && (abonnement.vuesUtilisees || 0) >= quotaTotal) {
      return res.status(403).json({ 
        message: 'Quota mensuel dépassé',
        quotaTotal,
        vuesUtilisees: abonnement.vuesUtilisees
      });
    }

    // Enregistrer la vue dans ProductView
    const newView = new ProductView({
      userId: user._id,
      productId
    });
    await newView.save();

    // Mettre à jour le compteur dans l'utilisateur
    user.abonnement.vuesUtilisees = (user.abonnement.vuesUtilisees || 0) + 1;
    user.abonnement.derniereVue = new Date();
    await user.save();

    return res.status(201).json({ 
      message: 'Vue enregistrée avec succès',
      vuesUtilisees: user.abonnement.vuesUtilisees
    });
  } catch (err) {
    console.error('❌ Erreur enregistrerVueProduit :', err);
    return res.status(500).json({ 
      message: 'Erreur interne serveur',
      error: err.message
    });
  }
};

/**
 * ✅ GET /users/products/:productId/can-access
 * Vérifie l'accès à un produit
 */
exports.verifierAccesProduit = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { productId } = req.params;

    if (!user) {
      return res.status(404).json({ accessGranted: false, message: 'Utilisateur non trouvé' });
    }

    // Vérifier le rôle
    if (user.role !== 'consommateur') {
      return res.status(403).json({ accessGranted: false, message: 'Accès réservé aux consommateurs' });
    }

    const abonnement = user.abonnement || {};
    const dateFin = abonnement.dateFin ? new Date(abonnement.dateFin) : null;
    
    // Vérifier si l'abonnement est actif
    const abonnementActif = abonnement.statut === 'actif' && 
                            dateFin && 
                            dateFin > new Date();

    if (!abonnementActif) {
      return res.status(403).json({ 
        accessGranted: false, 
        message: 'Abonnement inactif ou expiré' 
      });
    }

    // Déterminer le quota selon la formule
    const quotas = {
      BLEU: 1,
      GOLD: 5,
      PLATINUM: Infinity
    };
    const quotaTotal = abonnement.formule ? quotas[abonnement.formule] || 0 : 0;
    
    // Vérifier si le quota est atteint
    if (quotaTotal !== Infinity && (abonnement.vuesUtilisees || 0) >= quotaTotal) {
      return res.status(403).json({ 
        accessGranted: false, 
        message: 'Quota mensuel dépassé',
        quotaTotal,
        vuesUtilisees: abonnement.vuesUtilisees
      });
    }

    // Accès autorisé
    return res.status(200).json({ 
      accessGranted: true,
      vuesRestantes: quotaTotal === Infinity 
        ? 'Illimité' 
        : quotaTotal - (abonnement.vuesUtilisees || 0)
    });
  } catch (err) {
    console.error('❌ Erreur verifierAccesProduit :', err);
    return res.status(500).json({ 
      accessGranted: false, 
      message: 'Erreur serveur',
      error: err.message
    });
  }
};