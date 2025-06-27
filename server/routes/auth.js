const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middlewares/auth');

// =============================================
// 🔐 CONNEXION UTILISATEUR
// =============================================
router.post('/connexion', async (req, res) => {
  // ✅ Journalisation utile pour debug
  console.log('🔍 Tentative de connexion - req.body:', req.body);

  // ✅ Vérification existence de req.body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Données manquantes ou invalides dans la requête'
    });
  }

  const { email, motDePasse } = req.body;

  // ✅ Validation des champs obligatoires
  if (!email || !motDePasse) {
    return res.status(400).json({
      success: false,
      message: 'Email et mot de passe requis'
    });
  }

  try {
    // 🔎 Recherche de l'utilisateur avec sélection explicite du mot de passe
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // 🔐 Vérification du mot de passe
    const passwordMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }

    // ❌ Vérification si le compte est désactivé
    if (!user.estActif) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur.'
      });
    }

    // ✅ Génération du token
    const token = generateToken(user);

    // 🍪 Définition du cookie sécurisé (optionnel)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000, // 1h
      domain: process.env.NODE_ENV === 'production' ? '.votredomaine.com' : undefined
    });

    // ✅ Réponse utilisateur (sans mot de passe)
    const userData = {
      id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role,
      estActif: user.estActif
    };

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      utilisateur: userData,
      token
    });

  } catch (error) {
    console.error('❌ [Connexion] Erreur serveur :', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// ✅ INFOS DE L’UTILISATEUR CONNECTÉ
// =============================================
router.get('/me', protect, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Session expirée ou invalide'
      });
    }

    const userData = {
      id: req.user._id,
      nom: req.user.nom,
      email: req.user.email,
      role: req.user.role,
      estActif: req.user.estActif
    };

    return res.status(200).json({
      success: true,
      utilisateur: userData
    });
  } catch (error) {
    console.error('[Me] Erreur serveur :', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// =============================================
// ✅ TEST DISPONIBILITÉ DE L'API AUTH
// =============================================
router.get('/', (req, res) => {
  res.json({
    status: 'active',
    message: 'API Auth opérationnelle',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
