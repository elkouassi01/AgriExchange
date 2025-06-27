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
// Limites de produits selon les formules d'abonnement
const PRODUCT_LIMITS = {
  BLEU: 5,
  GOLD: 20,
  PLATINUM: Infinity
};

// ============================================
// MIDDLEWARES DE VALIDATION
// ============================================
// Validation des paramètres d'ID
const validateIdParam = [
  param('id').isMongoId().withMessage('ID produit invalide'),
  handleValidationErrors
];

// Validation pour la création de produit
const validateProduct = [
  body('nom').notEmpty().withMessage('Le nom est obligatoire')
            .isLength({ max: 100 }).withMessage('Le nom ne peut dépasser 100 caractères'),
  body('prix').isFloat({ min: 0.01 }).withMessage('Prix invalide (min 0.01)'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description limitée à 500 caractères'),
  body('imageUrl').optional().isURL().withMessage('URL image invalide'),
  body('images').optional().isArray().withMessage('Les images doivent être un tableau'),
  body('images.*').optional().isURL().withMessage('URL image invalide'),
  body('categorie').isIn(['fruits', 'légumes', 'viandes', 'produits laitiers', 'céréales', 'épices', 'autres'])
                  .withMessage('Catégorie invalide'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock invalide (entier positif)'),
  body('dateRecolte').isISO8601().toDate().withMessage('Date de récolte invalide (format ISO8601)'),
  body('unite').optional().isIn(['kg', 'litre', 'pièce', 'sachet', 'boîte', 'botte', 'autre'])
               .withMessage('Unité invalide'),
  body('etat').optional().isIn(['frais', 'sec', 'congelé', 'transformé', 'séché', 'fermenté', 'autre'])
              .withMessage('État invalide'),
  body('tags').optional().isArray().withMessage('Les tags doivent être un tableau'),
  body('tags.*').optional().isString().withMessage('Chaque tag doit être une chaîne'),
  body('certifications').optional().isArray().withMessage('Les certifications doivent être un tableau'),
  body('certifications.*').optional().isIn(['bio', 'AOP', 'IGP', 'label rouge', 'commerce équitable', 'sans OGM'])
                          .withMessage('Certification invalide'),
  body('mensurations').optional().isString().withMessage('Mensurations invalides'),
  handleValidationErrors
];

// Validation pour la mise à jour partielle de produit
const validateProductPatch = [
  body('nom').optional().isLength({ max: 100 }).withMessage('Nom trop long (max 100 caractères)'),
  body('prix').optional().isFloat({ min: 0.01 }).withMessage('Prix invalide (min 0.01)'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description limitée à 500 caractères'),
  body('imageUrl').optional().isURL().withMessage('URL image invalide'),
  body('images').optional().isArray().withMessage('Les images doivent être un tableau'),
  body('images.*').optional().isURL().withMessage('URL image invalide'),
  body('categorie').optional().isIn(['fruits', 'légumes', 'viandes', 'produits laitiers', 'céréales', 'épices', 'autres'])
                  .withMessage('Catégorie invalide'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock invalide (entier positif)'),
  body('dateRecolte').optional().isISO8601().toDate().withMessage('Date de récolte invalide (format ISO8601)'),
  body('unite').optional().isIn(['kg', 'litre', 'pièce', 'sachet', 'boîte', 'botte', 'autre'])
               .withMessage('Unité invalide'),
  body('etat').optional().isIn(['frais', 'sec', 'congelé', 'transformé', 'séché', 'fermenté', 'autre'])
              .withMessage('État invalide'),
  body('tags').optional().isArray().withMessage('Les tags doivent être un tableau'),
  body('tags.*').optional().isString().withMessage('Chaque tag doit être une chaîne'),
  body('certifications').optional().isArray().withMessage('Les certifications doivent être un tableau'),
  body('certifications.*').optional().isIn(['bio', 'AOP', 'IGP', 'label rouge', 'commerce équitable', 'sans OGM'])
                          .withMessage('Certification invalide'),
  body('mensurations').optional().isString().withMessage('Mensurations invalides'),
  handleValidationErrors
];

// Validation des paramètres de requête
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
 * Récupère une liste paginée de produits avec filtres
 * 
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} Liste paginée de produits
 */
router.get('/', validateQueryParams, async (req, res) => {
  try {
    // Extraction et traitement des paramètres de requête
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

    // Construction du filtre dynamique
    if (categorie) filter.categorie = categorie;
    if (minPrice || maxPrice) {
      filter.prix = {};
      if (minPrice) filter.prix.$gte = parseFloat(minPrice);
      if (maxPrice) filter.prix.$lte = parseFloat(maxPrice);
    }
    if (inStock === 'true') filter.stock = { $gt: 0 };
    
    // Configuration de la recherche textuelle
    let textScore = null;
    if (search) {
      filter.$text = { $search: search };
      textScore = { score: { $meta: 'textScore' } };
    }

    // Configuration de la pagination et du tri
    const skip = (page - 1) * limit;
    const sortOptions = {};
    
    if (sort) {
      const sortField = sort.replace(/^-/, '');
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      sortOptions[sortField] = sortOrder;
    }

    // Exécution parallèle des requêtes pour optimisation
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(textScore || sortOptions) // Priorité au score de recherche si applicable
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'nom ferme contact rating')
        .lean(),
      Product.countDocuments(filter)
    ]);

    // Ajout des champs virtuels à chaque produit
    const productsWithVirtuals = products.map(produit => {
      // Calcul des jours depuis la récolte
      const joursDepuisRecolte = moment().diff(moment(produit.dateRecolte), 'days');
      
      return {
        ...produit,
        prixTTC: parseFloat((produit.prix * 1.2).toFixed(2)),
        joursDepuisRecolte,
        disponible: produit.stock > 0,
        
        // Calcul dynamique du statut de fraîcheur
        statutFraicheur: (() => {
          if (joursDepuisRecolte <= 1) return 'Très frais';
          if (joursDepuisRecolte <= 3) return 'Frais';
          if (joursDepuisRecolte <= 7) return 'Bon';
          return 'À consommer rapidement';
        })()
      };
    });

    res.json({
      success: true,
      products: productsWithVirtuals,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
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
 * Récupère un produit spécifique par son ID
 * 
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} Détails du produit
 */
router.get('/:id', validateIdParam, async (req, res) => {
  try {
    const produit = await Product.findById(req.params.id)
      .populate('sellerId', 'nom ferme contact rating')
      .lean();

    if (!produit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Produit non trouvé' 
      });
    }

    // Calcul des valeurs dynamiques
    const joursDepuisRecolte = moment().diff(moment(produit.dateRecolte), 'days');
    const prixTTC = parseFloat((produit.prix * 1.2).toFixed(2));
    const disponible = produit.stock > 0;
    
    // Détermination du statut de fraîcheur
    let statutFraicheur = '';
    if (joursDepuisRecolte <= 1) statutFraicheur = 'Très frais';
    else if (joursDepuisRecolte <= 3) statutFraicheur = 'Frais';
    else if (joursDepuisRecolte <= 7) statutFraicheur = 'Bon';
    else statutFraicheur = 'À consommer rapidement';

    // Création de l'objet avec les valeurs dynamiques
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
 * Crée un nouveau produit
 * 
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} Nouveau produit créé
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

    // Vérification des limites d'abonnement
    const plan = user.abonnement?.formule?.toUpperCase();
    if (!plan || !(plan in PRODUCT_LIMITS)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Formule d\'abonnement non valide' 
      });
    }

    // Vérification du quota de produits
    const productCount = await Product.countDocuments({ sellerId: user._id });
    if (productCount >= PRODUCT_LIMITS[plan]) {
      return res.status(403).json({
        success: false,
        message: `Limite de ${PRODUCT_LIMITS[plan]} produits atteinte`,
        limit: PRODUCT_LIMITS[plan],
        currentCount: productCount
      });
    }

    // Préparation des données du produit
    const productData = {
      ...req.body,
      sellerId: user._id,
      // Valeurs par défaut pour les champs optionnels
      unite: req.body.unite || 'kg',
      etat: req.body.etat || 'frais',
      tags: req.body.tags || [],
      certifications: req.body.certifications || [],
      mensurations: req.body.mensurations || '',
      images: req.body.images || [],
      // Gestion de l'image principale
      imageUrl: req.body.imageUrl || (req.body.images?.length > 0 ? req.body.images[0] : undefined)
    };

    // Création et sauvegarde du produit
    const nouveauProduit = new Product(productData);
    const produitSauvegarde = await nouveauProduit.save();
    
    // Réponse avec les données pertinentes
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
          ferme: user.fermeNom
        },
        createdAt: produitSauvegarde.createdAt
      }
    });
  } catch (err) {
    console.error('POST /products error:', err);
    
    // Gestion spécifique des erreurs de validation
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
 * Met à jour partiellement un produit existant
 * 
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} Produit mis à jour
 */
router.patch('/:id', protect, authorize(['agriculteur', 'admin']), validateIdParam, validateProductPatch, async (req, res) => {
  try {
    // Récupération du produit à mettre à jour
    const produit = await Product.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Produit non trouvé' 
      });
    }

    // Vérification des permissions
    const isOwner = produit.sellerId.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé à modifier ce produit' 
      });
    }

    // Liste des champs autorisés pour la mise à jour
    const allowedUpdates = [
      'nom', 'prix', 'description', 'imageUrl', 'images',
      'categorie', 'stock', 'dateRecolte', 'etat',
      'tags', 'certifications', 'mensurations', 'unite'
    ];

    // Application des mises à jour
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        produit[field] = req.body[field];
      }
    });

    // Gestion spéciale des images
    if (req.body.images && !req.body.imageUrl) {
      produit.imageUrl = req.body.images[0] || produit.imageUrl;
    }

    // Validation et sauvegarde
    await produit.validate();
    const updated = await produit.save();

    res.json({ 
      success: true, 
      message: 'Produit mis à jour avec succès', 
      product: updated 
    });
  } catch (err) {
    console.error('PATCH /products error:', err);
    
    // Gestion des erreurs de validation
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
 * Supprime un produit existant
 * 
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @returns {Object} Confirmation de suppression
 */
router.delete('/:id', protect, authorize(['agriculteur', 'admin']), validateIdParam, async (req, res) => {
  try {
    // Récupération du produit à supprimer
    const produit = await Product.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Produit non trouvé' 
      });
    }

    // Vérification des permissions
    const isOwner = produit.sellerId.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé à supprimer ce produit' 
      });
    }

    // Suppression du produit
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