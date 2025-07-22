//models/ProductView.js
const mongoose = require('mongoose');
const moment = require('moment');

const productViewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "L'utilisateur est requis"],
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, "Le produit est requis"],
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    get: (createdAt) => moment(createdAt).format('YYYY-MM-DD HH:mm:ss')
  },
  // Champ supplémentaire pour optimiser les requêtes mensuelles
  monthYear: {
    type: String,
    default: () => moment().format('YYYY-MM'),
    index: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Index composé pour optimiser les requêtes de comptage
productViewSchema.index({ userId: 1, monthYear: 1 });

// Méthode statique pour obtenir le nombre de vues du mois
productViewSchema.statics.getMonthlyViews = async function(userId) {
  const monthYear = moment().format('YYYY-MM');
  return this.countDocuments({ userId, monthYear });
};

// Middleware pour mettre à jour le compteur de vues dans l'utilisateur
productViewSchema.post('save', async function(doc) {
  try {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(doc.userId, {
      $inc: { 'abonnement.vuesUtilisees': 1 },
      $set: { 'abonnement.derniereVue': new Date() }
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du compteur de vues:", error);
  }
});

const ProductView = mongoose.model('ProductView', productViewSchema);

module.exports = ProductView;