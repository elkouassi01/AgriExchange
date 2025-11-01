const express = require('express');
const router = express.Router();
const {
  login,
  getUserForfait,
  enregistrerVueProduit,
  verifierAccesProduit
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/v1/users/login
 * @desc    Connexion d’un utilisateur avec email et mot de passe
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/v1/users/:id/forfait
 * @desc    Récupérer les informations d'abonnement d'un utilisateur (si connecté)
 * @access  Privé (utilisateur lui-même ou admin)
 */
router.get('/:id/forfait', protect, async (req, res, next) => {
  try {
    // 🔒 Vérifie que l’utilisateur connecté est autorisé à accéder à ces données
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accès refusé" });
    }

    return getUserForfait(req, res, next);
  } catch (error) {
    console.error("❌ Erreur route /forfait :", error.message);
    res.status(500).json({ message: "Erreur interne" });
  }
});

/**
 * @route   POST /api/v1/users/:id/consume-view
 * @desc    Enregistre une vue produit pour un utilisateur consommateur
 * @access  Privé (utilisateur lui-même ou admin)
 */
router.post('/:id/consume-view', protect, async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accès refusé" });
    }

    return enregistrerVueProduit(req, res, next);
  } catch (error) {
    console.error("❌ Erreur route /consume-view :", error.message);
    res.status(500).json({ message: "Erreur interne" });
  }
});

/**
 * @route   GET /api/v1/users/products/:productId/can-access
 * @desc    Vérifie si l'utilisateur peut accéder au produit (basé sur abonnement)
 * @access  Privé (utilisateur consommateur connecté)
 */
router.get('/products/:productId/can-access', protect, async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'consommateur') {
      return res.status(403).json({ message: "Accès refusé : rôle consommateur requis" });
    }

    return verifierAccesProduit(req, res, next);
  } catch (error) {
    console.error("❌ Erreur route /can-access :", error.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
