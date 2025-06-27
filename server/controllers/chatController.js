// controllers/chatController.js
const Message = require('../models/Message');

exports.envoyerMessage = async (req, res) => {
  try {
    const { produitId, receiverId, texte } = req.body;
    const senderId = req.user.id; // JWT auth

    const message = await Message.create({
      produitId,
      sender: senderId,
      receiver: receiverId,
      texte
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("Erreur envoi message:", error.message);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

exports.lireMessages = async (req, res) => {
  try {
    const { produitId, autreUserId } = req.params;
    const userId = req.user.id;

    const messages = await Message.find({
      produitId,
      $or: [
        { sender: userId, receiver: autreUserId },
        { sender: autreUserId, receiver: userId }
      ]
    }).sort({ date: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: "Erreur récupération messages" });
  }
};
