const mongoose = require('mongoose');

const planConsommateurSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // référence à l'utilisateur consommateur
    required: true,
    unique: true, // un utilisateur a un seul plan actif
  },
  forfait: {
    type: String,
    enum: ['BLEU', 'GOLD', 'PLATINUM'],
    required: true,
  },
  dateDebut: {
    type: Date,
    default: Date.now,
  },
  dureeMois: {
    type: Number,
    required: true,
  },
  dateFin: {
    type: Date,
  },
  accesVendeursMax: {
    type: Number,
    required: true,
  },
  statut: {
    type: String,
    enum: ['actif', 'expiré', 'annulé'],
    default: 'actif',
  }
});

// Middleware pour calculer automatiquement la dateFin selon dateDebut + dureeMois
planConsommateurSchema.pre('save', function(next) {
  if (!this.dateFin && this.dateDebut && this.dureeMois) {
    const fin = new Date(this.dateDebut);
    fin.setMonth(fin.getMonth() + this.dureeMois);
    this.dateFin = fin;
  }
  next();
});

module.exports = mongoose.model('PlanConsommateur', planConsommateurSchema);
