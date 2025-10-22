const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const { protect, authorize } = require('../middlewares/auth');
const { body, param, query } = require('express-validator');
const handleValidationErrors = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');
const moment = require('moment');

// ============================================
// CONSTANTES DE CONFIGURATION
// ============================================
// Limites de produits selon la formule d'abonnement du vendeur
const PRODUCT_LIMITS = {
  BLEU: 5,
  GOLD: 20,
  PLATINUM: Infinity
};

// ============================================
// MIDDLEWARES DE VALIDATION
// ============================================

// Validation de l'ID MongoDB passé en paramètre
const validateIdParam = [
  param('id').isMongoId().withMessage('ID produit invalide'),
  handleValidationErrors
];

// Validation des champs lors de la création d'un produit
const validateProduct = [
  body('nom').notEmpty().withMessage('Le nom est obligatoire')
            .isLength({ max: 100 }).withMessage('Le nom ne peut dépasser 100 caractères'),
  body('prix').isFloat({ min: 0.01 }).withMessage('Prix invalide (minimum 0.01)'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description limitée à 500 caractères'),
  body('imageUrl').optional().isURL().withMessage('URL image invalide'),
  body('images').optional().isArray().withMessage('Les images doivent être un tableau'),
  body('images.*').optional().isURL().withMessage('Chaque URL d\'image doit être valide'),
  body('categorie').isIn(['fruits', 'légumes', 'viandes', 'produits laitiers', 'céréales', 'épices', 'autres'])
                  .withMessage('Catégorie invalide'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock invalide (entier positif)'),
  body('dateRecolte').isISO8601().toDate().withMessage('Date de récolte invalide (format ISO8601)'),
  body('unite').optional().isIn(['kg', 'litre', 'pièce', 'sachet', 'boîte', 'botte', 'autre'])
               .withMessage('Unité invalide'),
  body('etat').optional().isIn(['frais', 'sec', 'congelé', 'transformé', 'séché', 'fermenté', 'autre'])
              .withMessage('État invalide'),
  body('tags').optional().isArray().withMessage('Les tags doivent être un tableau'),
  body('tags.*').optional().isString().withMessage('Chaque tag doit être une chaîne de caractères'),
  body('certifications').optional().isArray().withMessage('Les certifications doivent être un tableau'),
  body('certifications.*').optional().isIn(['bio', 'AOP', 'IGP', 'label rouge', 'commerce équitable', 'sans OGM'])
                          .withMessage('Certification invalide'),
  body('mensurations').optional().isString().withMessage('Mensurations invalides'),
  handleValidationErrors
];

// Validation des champs pour la mise à jour partielle (PATCH)
const validateProductPatch = [
  body('nom').optional().isLength({ max: 100 }).withMessage('Nom trop long (max 100 caractères)'),
  body('prix').optional().isFloat({ min: 0.01 }).withMessage('Prix invalide (minimum 0.01)'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description limitée à 500 caractères'),
  body('imageUrl').optional().isURL().withMessage('URL image invalide'),
  body('images').optional().isArray().withMessage('Les images doivent être un tableau'),
  body('images.*').optional().isURL().withMessage('Chaque URL d\'image doit être valide'),
  body('categorie').optional().isIn(['fruits', 'légumes', 'viandes', 'produits laitiers', 'céréales', 'épices', 'autres'])
                  .withMessage('Catégorie invalide'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock invalide (entier positif)'),
  body('dateRecolte').optional().isISO8601().toDate().withMessage('Date de récolte invalide (format ISO8601)'),
  body('unite').optional().isIn(['kg', 'litre', 'pièce', 'sachet', 'boîte', 'botte', 'autre'])
               .withMessage('Unité invalide'),
  body('etat').optional().isIn(['frais', 'sec', 'congelé', 'transformé', 'séché', 'fermenté', 'autre'])
              .withMessage('État invalide'),
  body('tags').optional().isArray().withMessage('Les tags doivent être un tableau'),
  body('tags.*').optional().isString().withMessage('Chaque tag doit être une chaîne de caractères'),
  body('certifications').optional().isArray().withMessage('Les certifications doivent être un tableau'),
  body('certifications.*').optional().isIn(['bio', 'AOP', 'IGP', 'label rouge', 'commerce équitable', 'sans OGM'])
                          .withMessage('Certification invalide'),
  body('mensurations').optional().isString().withMessage('Mensurations invalides'),
  handleValidationErrors
];

// Validation des paramètres de requête (pagination, filtres)
const validateQueryParams = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page invalide (entier > 0)'),
  query('limit').optional().isInt({ min: 1 }).toInt().withMessage('Limite invalide (entier > 0)'),
  query('sort').optional().isString().withMessage('Tri invalide'),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat().withMessage('Prix min invalide'),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat().withMessage('Prix max invalide'),
  query('inStock').optional().isIn(['true', 'false']).withMessage('inStock doit être true ou false'),
  handleValidationErrors
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/products
 * Récupère une liste paginée de produits avec filtres et recherche
 */
router.get('/', validateQueryParams, async (req, res) => {
  try {
    const {
      categorie,
      search,
      minPrice,
      maxPrice,
      inStock,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    const filter = {};

    // Filtres simples
    if (categorie) filter.categorie = categorie;
    if (minPrice || maxPrice) {
      filter.prix = {};
      if (minPrice) filter.prix.$gte = parseFloat(minPrice);
      if (maxPrice) filter.prix.$lte = parseFloat(maxPrice);
    }
    if (inStock === 'true') filter.stock = { $gt: 0 };

    // Recherche textuelle
    let textScore = null;
    if (search) {
      filter.$text = { $search: search };
      textScore = { score: { $meta: 'textScore' } };
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Tri
    const sortOptions = {};
    if (sort) {
      const sortField = sort.replace(/^-/, '');
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      sortOptions[sortField] = sortOrder;
    }

    // Requête parallèle pour la liste + total
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(textScore || sortOptions) // Priorité score texte ou tri
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'nom ferme contact telephone email rating') // infos vendeur complètes
        .lean(),
      Product.countDocuments(filter)
    ]);

    // Ajout des champs calculés (prix TTC, fraîcheur, dispo)
    const productsWithVirtuals = products.map(produit => {
      const joursDepuisRecolte = moment().diff(moment(produit.dateRecolte), 'days');
      return {
        ...produit,
        prixTTC: parseFloat((produit.prix * 1.2).toFixed(2)),
        joursDepuisRecolte,
        disponible: produit.stock > 0,
        statutFraicheur: joursDepuisRecolte <= 1 ? 'Très frais'
                       : joursDepuisRecolte <= 3 ? 'Frais'
                       : joursDepuisRecolte <= 7 ? 'Bon'
                       : 'À consommer rapidement'
      };
    });

    res.json({
      success: true,
      products: productsWithVirtuals,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


/**
 * GET /api/products/:id
 * Récupère un produit par son ID avec les informations détaillées du vendeur
 */
router.get('/:id', validateIdParam, async (req, res) => {
  try {
    const produit = await Product.findById(req.params.id)
      .populate('sellerId', 'nom ferme contact telephone email rating') // infos vendeur détaillées
      .lean();

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Champs calculés dynamiques
    const joursDepuisRecolte = moment().diff(moment(produit.dateRecolte), 'days');
    const prixTTC = parseFloat((produit.prix * 1.2).toFixed(2));
    const disponible = produit.stock > 0;

    // Statut fraîcheur selon la date de récolte
    const statutFraicheur = joursDepuisRecolte <= 1 ? 'Très frais'
                        : joursDepuisRecolte <= 3 ? 'Frais'
                        : joursDepuisRecolte <= 7 ? 'Bon'
                        : 'À consommer rapidement';

    // Enrichissement de l'objet produit avec données virtuelles
    const produitAvecVirtuals = {
      ...produit,
      prixTTC,
      joursDepuisRecolte,
      disponible,
      statutFraicheur
    };

    res.json({
      success: true,
      product: produitAvecVirtuals
    });
  } catch (err) {
    console.error('GET /products/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


/**
 * POST /api/products
 * Création d'un nouveau produit par un utilisateur autorisé (agriculteur/admin)
 */
router.post('/', protect, authorize(['agriculteur', 'admin']), validateProduct, async (req, res) => {
  try {
    // Récupération de l'utilisateur authentifié
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérification de la formule d'abonnement
    const plan = user.abonnement?.formule?.toUpperCase();
    if (!plan || !(plan in PRODUCT_LIMITS)) {
      return res.status(403).json({
        success: false,
        message: 'Formule d\'abonnement non valide'
      });
    }

    // Vérification du quota produits
    const productCount = await Product.countDocuments({ sellerId: user._id });
    if (productCount >= PRODUCT_LIMITS[plan]) {
      return res.status(403).json({
        success: false,
        message: `Limite de ${PRODUCT_LIMITS[plan]} produits atteinte`,
        limit: PRODUCT_LIMITS[plan],
        currentCount: productCount
      });
    }

    // Préparation des données produit avec valeurs par défaut
    const productData = {
      ...req.body,
      sellerId: user._id,
      unite: req.body.unite || 'kg',
      etat: req.body.etat || 'frais',
      tags: req.body.tags || [],
      certifications: req.body.certifications || [],
      mensurations: req.body.mensurations || '',
      images: req.body.images || [],
      imageUrl: req.body.imageUrl || (req.body.images?.length > 0 ? req.body.images[0] : undefined)
    };

    // Création et sauvegarde du produit
    const nouveauProduit = new Product(productData);
    const produitSauvegarde = await nouveauProduit.save();

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      product: {
        id: produitSauvegarde._id,
        nom: produitSauvegarde.nom,
        prix: produitSauvegarde.prix,
        categorie: produitSauvegarde.categorie,
        vendeur: {
          id: user._id,
          nom: user.nom,
          ferme: user.fermeNom,
          email: user.email,
          telephone: user.contact
        },
        createdAt: produitSauvegarde.createdAt
      }
    });
  } catch (err) {
    console.error('POST /products error:', err);

    // Gestion des erreurs de validation mongoose
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation des données',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du produit',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


/**
 * PATCH /api/products/:id
 * Mise à jour partielle d'un produit (propriétaire ou admin)
 */
router.patch('/:id', protect, authorize(['agriculteur', 'admin']), validateIdParam, validateProductPatch, async (req, res) => {
  try {
    // Recherche du produit à modifier
    const produit = await Product.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérification de la propriété ou rôle admin
    const isOwner = produit.sellerId.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier ce produit'
      });
    }

    // Champs autorisés à mettre à jour
    const allowedUpdates = [
      'nom', 'prix', 'description', 'imageUrl', 'images',
      'categorie', 'stock', 'dateRecolte', 'etat',
      'tags', 'certifications', 'mensurations', 'unite'
    ];

    // Application des mises à jour uniquement sur les champs autorisés
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        produit[field] = req.body[field];
      }
    });

    // Mise à jour imageUrl si images présentes mais pas imageUrl
    if (req.body.images && !req.body.imageUrl) {
      produit.imageUrl = req.body.images[0] || produit.imageUrl;
    }

    // Validation mongoose avant sauvegarde
    await produit.validate();

    // Sauvegarde de la modification
    const updated = await produit.save();

    res.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      product: updated
    });
  } catch (err) {
    console.error('PATCH /products error:', err);

    // Gestion erreurs validation
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation des données',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du produit',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


/**
 * DELETE /api/products/:id
 * Suppression d'un produit (propriétaire ou admin)
 */
router.delete('/:id', protect, authorize(['agriculteur', 'admin']), validateIdParam, async (req, res) => {
  try {
    // Recherche du produit à supprimer
    const produit = await Product.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérification de la propriété ou rôle admin
    const isOwner = produit.sellerId.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer ce produit'
      });
    }

    // Suppression effective du produit
    await produit.deleteOne();

    res.json({
      success: true,
      message: 'Produit supprimé avec succès',
      deletedProductId: req.params.id
    });
  } catch (err) {
    console.error('DELETE /products error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du produit',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
