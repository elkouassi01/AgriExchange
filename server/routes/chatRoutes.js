const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware'); // Middleware pour vérifier le token JWT

/**
 * @route   POST /api/chat/send
 * @desc    Envoyer un message lié à un produit
 * @access  Privé (requiert authentification via JWT)
 */
router.post('/send', protect, chatController.envoyerMessage);

/**
 * @route   GET /api/chat/:produitId/:autreUserId
 * @desc    Récupérer tous les messages échangés sur un produit
 *          entre l'utilisateur connecté et un autre utilisateur
 * @access  Privé (requiert authentification via JWT)
 */
router.get('/:produitId/:autreUserId', protect, chatController.lireMessages);

module.exports = router;
