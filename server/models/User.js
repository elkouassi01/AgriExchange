const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// =======================
// 🔄 Sous-schéma productViews
// =======================
// Représente une vue d’un produit par l'utilisateur
// Avec date de consultation, pour limiter les vues par période
const ProductViewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false }); // Pas d'ID propre à chaque vue

// =======================
// 💼 Sous-schéma abonnement
// =======================
// Informations sur l'abonnement / forfait de l'utilisateur
const abonnementSchema = new mongoose.Schema({
  formule: {
    type: String,
    enum: ['BLEU', 'GOLD', 'PLATINUM', null],
    default: null,
    index: true
  },
  dateDebut: Date,
  dateFin: Date,
  montant: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'expiré', 'suspendu', 'en_attente'],
    default: 'inactif',
    index: true
  }
}, { _id: false });

// =======================
// 👤 Schéma principal utilisateur
// =======================
const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut excéder 50 caractères'],
    match: [/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes']
  },
  email: {
    type: String,
    required: [true, "L'email est obligatoire"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez entrer un email valide'],
    index: true
  },
  motDePasse: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: 6,
    select: false // Ne pas renvoyer ce champ dans les requêtes par défaut
  },
  contact: {
    type: String,
    required: [true, 'Le contact est obligatoire'],
    trim: true,
    unique: true,
    index: true
  },
  role: {
    type: String,
    enum: ['agriculteur', 'consommateur', 'admin'],
    default: 'consommateur',
    required: true,
    index: true
  },

  // === Champs spécifiques aux agriculteurs ===
  fermeNom: {
    type: String,
    trim: true,
    required: function () { return this.role === 'agriculteur'; }
  },
  localisation: {
    type: String,
    trim: true,
    required: function () { return this.role === 'agriculteur'; }
  },
  typeExploitation: {
    type: String,
    enum: ['maraîchage', 'élevage', 'céréaliculture', 'arboriculture', 'autre'],
    required: function () { return this.role === 'agriculteur'; }
  },

  // === Données d'abonnement ===
  abonnement: abonnementSchema,

  // === Historique des produits consultés ===
  productViews: [ProductViewSchema],

  // === Historique des transactions (paiements) ===
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],

  dateCreation: {
    type: Date,
    default: Date.now
  },
  derniereConnexion: Date,

  estActif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,  // createdAt, updatedAt automatique
  toJSON: { virtuals: true },  // Inclure les virtuals dans JSON
  toObject: { virtuals: true }
});

// =======================
// 🔐 Middleware : hash mot de passe avant save
// =======================
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();

  try {
    // Générer un sel puis hacher le mot de passe
    const salt = await bcrypt.genSalt(12); 
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// =======================
// 🧪 Vérification mot de passe lors de la connexion
// =======================
userSchema.methods.verifierMotDePasse = async function (motDePasse) {
  // Compare le mot de passe fourni avec le hash enregistré
  return bcrypt.compare(motDePasse, this.motDePasse);
};

// =======================
// 💳 Ajouter une transaction
// =======================
userSchema.methods.ajouterTransaction = function (transactionId) {
  this.transactions.push(transactionId);
  return this.save();
};

// =======================
// 📅 Créer ou mettre à jour l'abonnement
// =======================
userSchema.methods.mettreAJourAbonnement = function (formule, montant, dureeMois = 1) {
  const maintenant = new Date();
  const dateFin = new Date(maintenant);
  dateFin.setMonth(dateFin.getMonth() + dureeMois);

  this.abonnement = {
    formule,
    dateDebut: maintenant,
    dateFin,
    montant,
    statut: 'actif'
  };

  return this.save();
};

// =======================
// 👁️ Enregistrer une vue produit (max 1 fois / mois / produit)
// =======================
userSchema.methods.enregistrerVueProduit = async function (productId) {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  // Vérifie si ce produit a déjà été vu ce mois
  const dejaVu = this.productViews.some(view =>
    view.productId.equals(productId) && view.viewedAt >= debutMois
  );

  if (dejaVu) return false; // Ne pas enregistrer une vue multiple

  this.productViews.push({ productId, viewedAt: maintenant });
  await this.save();
  return true;
};

// =======================
// 🔢 Nombre de vues ce mois
// =======================
userSchema.methods.nombreVuesMoisCourant = function () {
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  return this.productViews.filter(view => view.viewedAt >= debutMois).length;
};

// =======================
// 📆 Vérifier si l'abonnement est encore actif
// =======================
userSchema.methods.isAbonnementActif = function () {
  if (!this.abonnement || !this.abonnement.dateFin) return false;
  return this.abonnement.statut === 'actif' && new Date() < new Date(this.abonnement.dateFin);
};

// =======================
// 🛑 Vérifier si abonnement est expiré
// =======================
userSchema.methods.isAbonnementExpire = function () {
  if (!this.abonnement || !this.abonnement.dateFin) return true;
  return new Date() >= new Date(this.abonnement.dateFin);
};

// =======================
// ⏳ Nombre de jours restants sur l'abonnement
// =======================
userSchema.methods.joursRestantsAbonnement = function () {
  if (!this.abonnement || !this.abonnement.dateFin) return 0;
  const diffMs = new Date(this.abonnement.dateFin) - new Date();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
};

// =======================
// Export du modèle User
// =======================
module.exports = mongoose.model('User', userSchema);
