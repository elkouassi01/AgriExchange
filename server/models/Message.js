// models/Message.js
const mongoose = require('mongoose');

/**
 * Schéma Message
 * 
 * Chaque message est lié à une conversation entre deux utilisateurs,
 * autour d'un produit précis (produitId).
 * 
 * Champs :
 * - produitId : référence au produit concerné (obligatoire)
 * - sender : utilisateur qui envoie le message (référence User)
 * - receiver : utilisateur qui reçoit le message (référence User)
 * - texte : contenu textuel du message
 * - lu : booléen indiquant si le message a été lu par le destinataire
 * - date : date d'envoi du message, valeur par défaut = date actuelle
 */
const messageSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',  // référence au modèle Product
    required: [true, 'Le produit lié au message est obligatoire']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',     // référence au modèle User (émetteur)
    required: [true, 'L\'expéditeur du message est obligatoire']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',     // référence au modèle User (destinataire)
    required: [true, 'Le destinataire du message est obligatoire']
  },
  texte: {
    type: String,
    required: [true, 'Le contenu du message est obligatoire'],
    trim: true,
    minlength: [1, 'Le message ne peut pas être vide'],
    maxlength: [2000, 'Le message ne peut dépasser 2000 caractères']
  },
  lu: {
    type: Boolean,
    default: false,  // false = message non lu au départ
    index: true      // indexé pour optimiser les recherches de messages non lus
  },
  date: {
    type: Date,
    default: Date.now, // date d'envoi par défaut = maintenant
    index: true        // index pour trier facilement les messages par date
  }
}, {
  timestamps: false,   // on utilise déjà 'date', pas besoin de createdAt/updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour accélérer les requêtes sur une conversation d’un produit entre 2 utilisateurs
messageSchema.index({ produitId: 1, sender: 1, receiver: 1, date: 1 });

// Export du modèle Mongoose
module.exports = mongoose.model('Message', messageSchema);
