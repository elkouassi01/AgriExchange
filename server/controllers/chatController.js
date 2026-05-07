const mysqlMessageRepository = require('../repositories/mysqlMessageRepository');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const { isMysql } = require('../utils/authHelpers');
const Message = require('../models/Message');

exports.envoyerMessage = async (req, res) => {
  try {
    const { produitId, receiverId, texte } = req.body;
    const senderId = req.user.id || req.user._id;

    if (!produitId || !receiverId || !texte) {
      return res.status(400).json({ success: false, error: "Données manquantes (produitId, receiverId, texte)" });
    }

    const payload = {
      senderId,
      receiverId,
      produitId,
      texte,
    };

    const message = isMysql()
      ? await mysqlMessageRepository.sendMessage(payload)
      : await Message.create({
          produitId,
          sender: senderId,
          receiver: receiverId,
          texte,
        });

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("Erreur envoi message:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de l'envoi du message" });
  }
};

exports.lireMessages = async (req, res) => {
  try {
    const { produitId, autreUserId } = req.params;
    const userId = req.user.id || req.user._id;

    const messages = isMysql()
      ? await mysqlMessageRepository.getMessages(produitId, userId, autreUserId)
      : await Message.find({
          produitId,
          $or: [
            { sender: userId, receiver: autreUserId },
            { sender: autreUserId, receiver: userId }
          ]
        }).sort({ date: 1 });

    return res.json({ success: true, messages });
  } catch (error) {
    console.error("Erreur récupération messages:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des messages" });
  }
};