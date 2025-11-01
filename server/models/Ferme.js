const mongoose = require('mongoose');

const fermeSchema = new mongoose.Schema({
  nomFerme: {
    type: String,
    required: true
  },
  typeExploitation: {
    type: String,
    enum: ['Traditionnel', 'Industriel'],
    required: true
  },
  localisation: {
    type: String,
    required: true
  },
  contact: {
    telephone: { type: String, required: true },
    email: { type: String, required: true }
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlanAgriculteur',
    required: true
  },
  dateDebut: {
    type: Date,
    default: Date.now
  },
  dateFin: {
    type: Date // Calculée automatiquement selon la durée du plan
  },
  accepteAccord: {
    type: Boolean,
    default: false
  },
  statut: {
    type: String,
    enum: ['en_attente', 'actif', 'refusé', 'expiré'],
    default: 'en_attente'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // lien vers l'utilisateur qui a créé cette ferme
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ferme', fermeSchema);
