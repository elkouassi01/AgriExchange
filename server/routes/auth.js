const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Limitation des tentatives de connexion pour la sécurité
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limite à 5 tentatives par fenêtre
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard'
});

// Middleware de validation
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('motDePasse').notEmpty().withMessage('Le mot de passe est requis')
];

router.post('/connexion', limiter, validateLogin, async (req, res) => {
  // Vérification des erreurs de validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, motDePasse } = req.body;

  try {
    // Recherche de l'utilisateur en sélectionnant explicitement le mot de passe
    const utilisateur = await User.findOne({ email }).select('+motDePasse');
    
    if (!utilisateur) {
      return res.status(401).json({ 
        message: "Identifiants incorrects" // Message générique pour la sécurité
      });
    }

    const estValide = await utilisateur.verifierMotDePasse(motDePasse);
    if (!estValide) {
      return res.status(401).json({ 
        message: "Identifiants incorrects" // Même message que ci-dessus
      });
    }

    // Création du token JWT
    const token = jwt.sign(
      { 
        id: utilisateur._id, 
        role: utilisateur.role, 
        nom: utilisateur.nom 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRE || '1d',
        issuer: process.env.JWT_ISSUER || 'votre-application'
      }
    );

    // Options pour le cookie (si vous utilisez des cookies)
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 24 * 60 * 60 * 1000)
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    // Réponse avec token et données utilisateur (sans informations sensibles)
    res
      .status(200)
      .cookie('token', token, cookieOptions) // Optionnel: si vous utilisez des cookies
      .json({
        success: true,
        token,
        utilisateur: {
          id: utilisateur._id,
          nom: utilisateur.nom,
          role: utilisateur.role,
          email: utilisateur.email
        }
      });

  } catch (err) {
    console.error('Erreur de connexion:', err);
    res.status(500).json({ 
      success: false,
      message: "Une erreur est survenue lors de la connexion",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;