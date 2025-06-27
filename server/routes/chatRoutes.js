// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

// Envoyer un message
router.post('/send', protect, chatController.envoyerMessage);

// Lire tous les messages liés à un produit entre 2 utilisateurs
router.get('/:produitId/:autreUserId', protect, chatController.lireMessages);

module.exports = router;
