// models/PlanAgriculteur.js
const mongoose = require('mongoose');

const planAgriculteurSchema = new mongoose.Schema({
  nom: {
    type: String,
    enum: ['BLEU', 'GOLD', 'PLATINUM'],
    required: true
  },
  duree: {
    type: Number, // en jours
    required: true
  },
  maxProduits: {
    type: Number,
    required: true
  },
  restrictionCategorie: {
    type: Boolean,
    default: false // true pour BLEU uniquement
  },
  prix: {
    type: Number,
    default: 0 // gratuit pour le premier mois
  }
}, { timestamps: true });

module.exports = mongoose.model('PlanAgriculteur', planAgriculteurSchema);
