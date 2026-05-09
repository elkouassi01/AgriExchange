const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/auth');
const msgRepo = require('../repositories/mysqlMessageRepository');

// Envoyer un message (REST fallback)
router.post('/send', protect, chatController.envoyerMessage);

// Historique par produit (ancienne API, conservée)
router.get('/:produitId/:autreUserId', protect, chatController.lireMessages);

// Historique entre deux utilisateurs (sans produit)
router.get('/conversation/:otherUserId', protect, async (req, res) => {
  const userId = req.user.id || req.user._id;
  const messages = await msgRepo.getConversationMessages(userId, req.params.otherUserId);
  res.json({ success: true, messages });
});

// Liste des conversations
router.get('/conversations/list', protect, async (req, res) => {
  const userId = req.user.id || req.user._id;
  const conversations = await msgRepo.getConversations(userId);
  res.json({ success: true, conversations });
});

// Nombre de messages non lus
router.get('/unread/count', protect, async (req, res) => {
  const userId = req.user.id || req.user._id;
  const count = await msgRepo.getUnreadCount(userId);
  res.json({ count });
});

// Marquer une conversation comme lue
router.post('/read/:otherUserId', protect, async (req, res) => {
  const userId = req.user.id || req.user._id;
  await msgRepo.markConversationAsRead(userId, req.params.otherUserId);
  res.json({ success: true });
});

module.exports = router;
