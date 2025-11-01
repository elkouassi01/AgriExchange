const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "L'utilisateur est requis"],
    index: true // Ajout d'index pour les requêtes fréquentes
  },
  typeTransaction: {
    type: String,
    enum: ['abonnement', 'achat_produit', 'rechargement', 'remboursement'],
    required: [true, "Le type de transaction est requis"]
  },
  montant: {
    type: Number,
    required: [true, "Le montant est requis"],
    min: [100, "Le montant minimum est de 100 XOF"]
  },
  devise: {
    type: String,
    default: 'XOF',
    uppercase: true,
    validate: {
      validator: v => /^[A-Z]{3}$/.test(v),
      message: "Devise invalide (format ISO 4217)"
    }
  },
  methode: {
    type: String,
    enum: ['mobile_money', 'carte_credit', 'virement', 'admin', 'autre'],
    required: [true, "La méthode de paiement est requise"]
  },
  servicePaiement: {
    type: String,
    enum: ['cinetpay', 'stripe', 'paypal', 'manual'],
    default: 'cinetpay'
  },
  statut: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  reference: {
    type: String,
    required: [true, "La référence est requise"],
    unique: true,
    index: true
  },
  description: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    select: false // Masqué par défaut pour la sécurité
  },
  donneesAPI: {
    type: mongoose.Schema.Types.Mixed,
    select: false // Données sensibles toujours masquées
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Suppression des champs sensibles dans les réponses JSON
      delete ret.metadata;
      delete ret.donneesAPI;
      return ret;
    }
  }
});

// Index composé pour les recherches fréquentes
transactionSchema.index({ userId: 1, createdAt: -1 });

// Virtual pour la date formatée
transactionSchema.virtual('dateFormatee').get(function() {
  return this.createdAt.toLocaleString('fr-FR');
});

// Méthode pour initier un paiement CinetPay
transactionSchema.statics.creerTransactionCinetPay = async function(userId, montant, metadata) {
  const reference = `CP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  return this.create({
    userId,
    montant,
    typeTransaction: 'abonnement',
    methode: 'mobile_money',
    reference,
    description: 'Paiement via CinetPay',
    metadata,
    servicePaiement: 'cinetpay',
    donneesAPI: metadata
  });
};

// Méthode pour mettre à jour le statut
transactionSchema.methods.mettreAJourStatut = async function(nouveauStatut, donneesAPI) {
  this.statut = nouveauStatut;
  if (donneesAPI) this.donneesAPI = { ...this.donneesAPI, ...donneesAPI };
  return this.save();
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;