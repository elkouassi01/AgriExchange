// server/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: [true, 'Le nom du produit est obligatoire'],
    trim: true,
    maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
  },
  prix: { 
    type: Number, 
    required: true,
    min: [0, 'Le prix ne peut pas être négatif'],
    set: v => Math.round(v * 100) / 100 // Arrondi à 2 décimales
  },
  description: {
    type: String,
    default: "",
    maxlength: [500, 'La description est limitée à 500 caractères']
  },
  imageUrl: {
    type: String,
    match: [/^https?:\/\//i, 'URL invalide (doit commencer par http:// ou https://)'],
    default: "https://via.placeholder.com/150" // Image par défaut
  },
  categorie: {
    type: String,
    enum: ['fruits', 'légumes', 'viandes', 'produits laitiers', 'autres'],
    required: true
  },
  stock: {
    type: Number,
    min: 0,
    default: 0
  },
  unite: {
    type: String,
    enum: ['kg', 'litre', 'pièce', 'sachet', 'autre'],
    default: 'kg'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour recherche textuelle
productSchema.index({ nom: 'text', description: 'text' });

// Méthode d'instance pour appliquer une réduction
productSchema.methods.applyDiscount = function(pourcentage) {
  if (pourcentage < 0 || pourcentage > 100) {
    throw new Error('Le pourcentage doit être entre 0 et 100');
  }
  return this.prix * (1 - pourcentage / 100);
};

// Virtual pour afficher le prix TTC
productSchema.virtual('prixTTC').get(function() {
  return (this.prix * 1.2).toFixed(2);
});

// Middleware pré-save
productSchema.pre('save', function(next) {
  if (this.stock < 0) {
    throw new Error('Le stock ne peut pas être négatif');
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
