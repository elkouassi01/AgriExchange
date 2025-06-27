const mongoose = require('mongoose');
const moment = require('moment');
const mongoosePaginate = require('mongoose-paginate-v2'); // Import du plugin de pagination

/**
 * Schéma Mongoose pour les produits agricoles
 * 
 * Ce modèle représente un produit agricole dans la plateforme AgriExchange.
 * Il inclut toutes les caractéristiques d'un produit, ses relations et des méthodes utilitaires.
 */
const productSchema = new mongoose.Schema({
  // SECTION 1: INFORMATIONS DE BASE
  nom: { 
    type: String, 
    required: [true, 'Le nom du produit est obligatoire'],
    trim: true,
    maxlength: [100, 'Le nom ne peut dépasser 100 caractères'],
    text: true, // Indexation pour recherche textuelle
    // Normalisation lors de la sauvegarde
    set: function(nom) {
      // Capitalise chaque mot et supprime les espaces superflus
      return nom.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
    }
  },
  prix: { 
    type: Number, 
    required: [true, 'Le prix est obligatoire'],
    min: [0.01, 'Le prix doit être supérieur à 0'],
    set: v => parseFloat(Number(v).toFixed(2)) // Garantit 2 décimales
  },
  description: {
    type: String,
    default: "",
    maxlength: [500, 'La description est limitée à 500 caractères'],
    text: true, // Indexation pour recherche textuelle
    trim: true
  },

  // SECTION 2: IMAGES ET VISUELS
  imageUrl: {
    type: String,
    match: [/^https?:\/\//i, 'URL invalide (doit commencer par http:// ou https://)'],
    default: "https://via.placeholder.com/150"
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr) {
        return arr.every(url => /^https?:\/\//i.test(url));
      },
      message: 'Une ou plusieurs URL d\'images sont invalides'
    }
  },

  // SECTION 3: CATÉGORISATION ET STOCK
  categorie: {
    type: String,
    enum: {
      values: [
        'fruits', 'légumes', 'viandes', 'produits laitiers', 
        'céréales', 'épices', 'autres'
      ],
      message: 'Catégorie invalide'
    },
    required: [true, 'La catégorie est obligatoire'],
    index: true,
    // Normalisation en minuscules
    set: function(cat) {
      return cat.toLowerCase();
    }
  },
  stock: {
    type: Number,
    min: [0, 'Le stock ne peut pas être négatif'],
    default: 0,
    set: v => Math.floor(Number(v)) // Garantit un entier
  },
  unite: {
    type: String,
    enum: ['kg', 'litre', 'pièce', 'sachet', 'boîte', 'botte', 'autre'],
    default: 'kg',
    // Normalisation en minuscules
    set: function(unit) {
      return unit.toLowerCase();
    }
  },

  // SECTION 4: INFORMATIONS FOURNISSEUR
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le fournisseur (sellerId) est requis'],
    index: true
  },
  dateRecolte: {
    type: Date,
    required: [true, 'La date de récolte est obligatoire'],
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'La date de récolte ne peut pas être dans le futur'
    },
    set: function(date) {
      // Normalisation: s'assurer que la date est au format UTC
      return new Date(date);
    }
  },

  // SECTION 5: CARACTÉRISTIQUES PRODUIT
  mensurations: {
    type: String,
    maxlength: [100, 'Les mensurations sont limitées à 100 caractères'],
    trim: true
  },
  etat: {
    type: String,
    enum: {
      values: ['frais', 'sec', 'congelé', 'transformé', 'séché', 'fermenté', 'autre'],
      message: 'État invalide'
    },
    default: 'frais',
    // Normalisation en minuscules
    set: function(etat) {
      return etat.toLowerCase();
    }
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags) {
        return tags.length <= 10 && tags.every(tag => tag.length <= 20);
      },
      message: 'Maximum 10 tags autorisés (20 caractères max par tag)'
    },
    set: function(tags) {
      // Normalisation: minuscules, suppression des espaces, tags uniques
      return [...new Set(
        tags.map(tag => tag.toLowerCase().trim().replace(/\s+/g, ' '))
      )];
    }
  },
  certifications: {
    type: [String],
    enum: ['bio', 'AOP', 'IGP', 'label rouge', 'commerce équitable', 'sans OGM'],
    default: [],
    set: function(certs) {
      // Normalisation en minuscules et suppression des doublons
      return [...new Set(certs.map(c => c.toLowerCase()))];
    }
  },

  // SECTION 6: MÉTADONNÉES ET STATISTIQUES
  isFeatured: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    set: v => parseFloat(Number(v).toFixed(1)) // 1 décimale pour la note
  },
  reviewsCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { 
  // Options du schéma
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  toJSON: { 
    virtuals: true, // Inclut les virtuals dans les conversions JSON
    transform: function(doc, ret) {
      // Supprime les champs internes dans les réponses API
      delete ret.__v;
      delete ret._id;
      // Convertit l'ID en string pour une meilleure compatibilité
      ret.id = doc._id.toString();
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      ret.id = doc._id.toString();
      return ret;
    }
  }
});

// ============================================
// PLUGINS
// ============================================

// Ajout du plugin de pagination (nécessaire pour Product.paginate())
productSchema.plugin(mongoosePaginate);

// ============================================
// INDEXATION POUR PERFORMANCE DES REQUÊTES
// ============================================

// Index pour recherche textuelle (nom, description, tags)
productSchema.index({ 
  nom: 'text', 
  description: 'text',
  tags: 'text'
}, { 
  weights: { 
    nom: 10,    // Priorité la plus élevée au nom
    tags: 5,    // Priorité moyenne aux tags
    description: 1  // Priorité la plus basse à la description
  },
  name: 'text_search_index' 
});

// Index composé pour les filtres courants
productSchema.index({ 
  categorie: 1, 
  etat: 1, 
  isFeatured: 1,
  createdAt: -1 
}, { name: 'category_featured_index' });

// Index pour les requêtes par fournisseur et date
productSchema.index({ 
  sellerId: 1, 
  dateRecolte: -1 
}, { name: 'seller_date_index' });

// Index pour la disponibilité et le prix
productSchema.index({
  stock: 1,
  prix: 1
}, { name: 'stock_price_index' });

// ============================================
// VIRTUAL FIELDS (Champs calculés)
// ============================================

// Prix TTC avec TVA de 20%
productSchema.virtual('prixTTC').get(function() {
  return parseFloat((this.prix * 1.2).toFixed(2));
});

// Nombre de jours depuis la récolte
productSchema.virtual('joursDepuisRecolte').get(function() {
  return moment().diff(moment(this.dateRecolte), 'days');
});

// Indicateur de disponibilité
productSchema.virtual('disponible').get(function() {
  return this.stock > 0;
});

// Statut de fraîcheur
productSchema.virtual('statutFraicheur').get(function() {
  const jours = this.joursDepuisRecolte;
  if (jours <= 1) return 'Très frais';
  if (jours <= 3) return 'Frais';
  if (jours <= 7) return 'Bon';
  return 'À consommer rapidement';
});

// ============================================
// POPULATE VIRTUALS (Jointures virtuelles)
// ============================================

// Jointure virtuelle avec le modèle User
productSchema.virtual('vendeur', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true,
  options: { 
    select: 'nom email contact fermeNom rating',
    transform: (doc) => {
      // Transformation pour masquer les données sensibles
      if (doc) {
        return {
          id: doc._id.toString(),
          nom: doc.nom,
          ferme: doc.fermeNom,
          contact: doc.contact,
          rating: doc.rating
        };
      }
      return doc;
    }
  }
});

// ============================================
// METHODS (Méthodes d'instance)
// ============================================

/**
 * Applique une réduction au prix du produit
 * @param {number} pourcentage - Pourcentage de réduction (0-100)
 * @returns {number} Nouveau prix après réduction
 */
productSchema.methods.applyDiscount = function(pourcentage) {
  if (pourcentage < 0 || pourcentage > 100) {
    throw new Error('Le pourcentage doit être entre 0 et 100');
  }
  return parseFloat((this.prix * (1 - pourcentage / 100)).toFixed(2));
};

/**
 * Met à jour le stock du produit
 * @param {number} quantity - Quantité à ajouter (positive) ou retirer (négative)
 * @returns {Promise} Promesse résolue après mise à jour
 */
productSchema.methods.updateStock = async function(quantity) {
  if (this.stock + quantity < 0) {
    throw new Error('Stock insuffisant');
  }
  this.stock += quantity;
  return this.save();
};

// ============================================
// MIDDLEWARE (Hooks)
// ============================================

// Pré-validation: Normalisation des données
productSchema.pre('validate', function(next) {
  // S'assure que la date de récolte est valide
  if (this.dateRecolte && this.dateRecolte > new Date()) {
    return next(new Error('La date de récolte ne peut pas être dans le futur'));
  }
  
  next();
});

// Pré-sauvegarde: Dernières validations
productSchema.pre('save', function(next) {
  // Validation supplémentaire du stock
  if (this.stock < 0) {
    return next(new Error('Le stock ne peut pas être négatif'));
  }
  
  next();
});

// Post-sauvegarde: Mise à jour des compteurs
productSchema.post('save', async function(doc) {
  try {
    // Mise à jour du compteur de produits du vendeur
    await mongoose.model('User').updateOne(
      { _id: doc.sellerId },
      { $inc: { productCount: 1 } }
    );
  } catch (error) {
    console.error('Erreur post-save Product:', error);
  }
});

// Pré-suppression: Nettoyage des dépendances
productSchema.pre('remove', async function(next) {
  try {
    // Décrémente le compteur de produits du vendeur
    await mongoose.model('User').updateOne(
      { _id: this.sellerId },
      { $inc: { productCount: -1 } }
    );
    
    // Supprime les avis associés
    await mongoose.model('Review').deleteMany({ productId: this._id });
    
    next();
  } catch (error) {
    console.error('Erreur pre-remove Product:', error);
    next(error);
  }
});

// ============================================
// STATICS (Méthodes statiques)
// ============================================

/**
 * Trouve les produits par catégorie avec pagination
 * @param {string} categorie - Catégorie de produit
 * @param {object} options - Options de pagination
 * @returns {Promise} Liste des produits paginés
 */
productSchema.statics.findByCategory = function(categorie, options = {}) {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  return this.find({ categorie })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('vendeur', 'nom fermeNom rating');
};

/**
 * Recherche de produits avec pagination et filtres
 * @param {Object} filter - Filtres de recherche
 * @param {Object} options - Options de pagination et tri
 * @returns {Promise} Résultats paginés
 */
productSchema.statics.searchProducts = async function(filter = {}, options = {}) {
  const { page = 1, limit = 10, sort = '-createdAt' } = options;
  
  const [results, total] = await Promise.all([
    this.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('vendeur', 'nom ferme rating'),
      
    this.countDocuments(filter)
  ]);
  
  return {
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
    results
  };
};

// Création du modèle Product
const Product = mongoose.model('Product', productSchema);

module.exports = Product;