const Message = require('../models/Message');
const mongoose = require('mongoose');

exports.envoyerMessage = async (req, res) => {
  try {
    const { produitId, receiverId, texte } = req.body;
    const senderId = req.user.id; // récupéré via middleware auth

    // Vérifications des données
    if (!produitId || !receiverId || !texte) {
      return res.status(400).json({ success: false, error: "Données manquantes (produitId, receiverId, texte)" });
    }
    if (!mongoose.Types.ObjectId.isValid(produitId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, error: "ID produit ou receiver invalide" });
    }

    const message = await Message.create({
      produitId,
      sender: senderId,
      receiver: receiverId,
      texte
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
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(produitId) || !mongoose.Types.ObjectId.isValid(autreUserId)) {
      return res.status(400).json({ success: false, error: "ID produit ou utilisateur invalide" });
    }

    // Cherche les messages entre userId et autreUserId pour le produit donné
    const messages = await Message.find({
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
