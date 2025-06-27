// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// POST /api/v1/auth/connexion
// Connexion utilisateur, renvoie token + info utilisateur
router.post('/connexion', authController.login);

// GET /api/v1/auth/me
// Retourne les infos du profil utilisateur connecté (protégé)
router.get('/me', protect, authController.getProfile);

// POST /api/v1/auth/logout
// Déconnexion (optionnel, supprime cookie, token, etc.)
router.post('/logout', protect, authController.logout);

module.exports = router;
