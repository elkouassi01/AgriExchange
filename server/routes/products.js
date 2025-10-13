const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middlewares/auth');

// @route   POST /api/v1/products/add
// @desc    Ajouter un nouveau produit
// @access  Privé (Agriculteurs seulement)
router.post('/add', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    console.log('🔍 Données reçues pour nouveau produit:', req.body);
    console.log('👤 Utilisateur authentifié:', {
      id: req.user._id,
      nom: req.user.nom,
      role: req.user.role
    });

    const {
      nom,
      prix,
      description,
      categorie,
      stock,
      unite,
      dateRecolte,
      mensurations,
      etat,
      tags,
      certifications,
      imageUrl,
      images
    } = req.body;

    // Validation des champs obligatoires
    const champsObligatoires = { 
      nom, 
      prix, 
      categorie, 
      stock, 
      unite, 
      dateRecolte 
    };
    
    const champsManquants = Object.keys(champsObligatoires)
      .filter(champ => !champsObligatoires[champ] && champsObligatoires[champ] !== 0);

    if (champsManquants.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: `Champs obligatoires manquants: ${champsManquants.join(', ')}`
      });
    }

    // Validation du prix
    if (parseFloat(prix) <= 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PRICE',
        message: 'Le prix doit être supérieur à 0'
      });
    }

    // Validation du stock
    if (parseInt(stock) < 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STOCK',
        message: 'Le stock ne peut pas être négatif'
      });
    }

    // Créer le nouveau produit
    const nouveauProduit = new Product({
      nom,
      prix: parseFloat(prix),
      description: description || "",
      categorie: categorie.toLowerCase(),
      stock: parseInt(stock),
      unite: unite.toLowerCase(),
      dateRecolte: new Date(dateRecolte),
      mensurations: mensurations || "",
      etat: (etat || "frais").toLowerCase(),
      tags: tags || [],
      certifications: certifications || [],
      imageUrl: imageUrl || "https://via.placeholder.com/150",
      images: images || [],
      sellerId: req.user._id
    });

    console.log('💾 Tentative de sauvegarde du produit...');
    
    // Sauvegarder le produit
    const produitSauvegarde = await nouveauProduit.save();
    
    // Populer les informations du vendeur
    await produitSauvegarde.populate({
      path: 'vendeur',
      select: 'nom email contact fermeNom rating'
    });

    console.log('✅ Produit sauvegardé avec succès:', {
      id: produitSauvegarde._id,
      nom: produitSauvegarde.nom,
      prix: produitSauvegarde.prix,
      stock: produitSauvegarde.stock
    });

    res.status(201).json({
      success: true,
      code: 'PRODUCT_CREATED',
      message: 'Produit ajouté avec succès !',
      product: produitSauvegarde
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du produit:', error);
    
    // Gestion des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Données du produit invalides',
        errors
      });
    }

    // Erreur de duplication
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_PRODUCT',
        message: 'Un produit avec ce nom existe déjà pour cet agriculteur'
      });
    }

    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de l\'ajout du produit',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
    });
  }
});

// @route   GET /api/v1/products
// @desc    Obtenir tous les produits avec pagination et filtres
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      categorie,
      etat,
      minPrix,
      maxPrix,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construction du filtre
    const filter = { stock: { $gt: 0 } };

    if (categorie) filter.categorie = categorie.toLowerCase();
    if (etat) filter.etat = etat.toLowerCase();
    if (minPrix || maxPrix) {
      filter.prix = {};
      if (minPrix) filter.prix.$gte = parseFloat(minPrix);
      if (maxPrix) filter.prix.$lte = parseFloat(maxPrix);
    }

    // Recherche textuelle
    if (search && search.trim() !== '') {
      filter.$text = { $search: search.trim() };
    }

    // Options de pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit) > 50 ? 50 : parseInt(limit), // Limite max de 50
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: {
        path: 'vendeur',
        select: 'nom email contact fermeNom rating'
      }
    };

    const result = await Product.paginate(filter, options);

    res.json({
      success: true,
      code: 'PRODUCTS_FETCHED',
      message: 'Produits récupérés avec succès',
      data: {
        products: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalProducts: result.totalDocs,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPrevPage,
          limit: result.limit
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits:', error);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la récupération des produits',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message
      })
    });
  }
});

// @route   GET /api/v1/products/my-products
// @desc    Obtenir les produits de l'agriculteur connecté
// @access  Privé (Agriculteurs)
router.get('/my-products', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      includeOutOfStock = false 
    } = req.query;

    // Filtre pour les produits de l'utilisateur
    const filter = { sellerId: req.user._id };
    
    // Inclure ou non les produits en rupture de stock
    if (includeOutOfStock !== 'true') {
      filter.stock = { $gt: 0 };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: {
        path: 'vendeur',
        select: 'nom email contact fermeNom rating'
      }
    };

    const result = await Product.paginate(filter, options);

    res.json({
      success: true,
      code: 'USER_PRODUCTS_FETCHED',
      message: 'Vos produits ont été récupérés avec succès',
      data: {
        products: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalProducts: result.totalDocs,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de vos produits:', error);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la récupération de vos produits'
    });
  }
});

// @route   GET /api/v1/products/:id
// @desc    Obtenir un produit spécifique
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'vendeur',
        select: 'nom email contact fermeNom rating adresse description'
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produit non trouvé'
      });
    }

    res.json({
      success: true,
      code: 'PRODUCT_FETCHED',
      message: 'Produit récupéré avec succès',
      data: { product }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du produit:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PRODUCT_ID',
        message: 'ID de produit invalide'
      });
    }

    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la récupération du produit'
    });
  }
});

// @route   PUT /api/v1/products/:id
// @desc    Modifier un produit
// @access  Privé (Propriétaire du produit)
router.put('/:id', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produit non trouvé ou vous n\'êtes pas autorisé à le modifier'
      });
    }

    // Champs autorisés pour la modification
    const allowedUpdates = [
      'nom', 'prix', 'description', 'categorie', 'stock', 'unite',
      'dateRecolte', 'mensurations', 'etat', 'tags', 'certifications',
      'imageUrl', 'images'
    ];

    // Filtrer les champs non autorisés
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    // Appliquer les modifications
    Object.keys(updates).forEach(key => {
      product[key] = updates[key];
    });

    const updatedProduct = await product.save();
    await updatedProduct.populate({
      path: 'vendeur',
      select: 'nom email contact fermeNom rating'
    });

    res.json({
      success: true,
      code: 'PRODUCT_UPDATED',
      message: 'Produit modifié avec succès',
      data: { product: updatedProduct }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la modification du produit:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Données de modification invalides',
        errors
      });
    }

    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la modification du produit'
    });
  }
});

// @route   DELETE /api/v1/products/:id
// @desc    Supprimer un produit
// @access  Privé (Propriétaire du produit)
router.delete('/:id', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produit non trouvé ou vous n\'êtes pas autorisé à le supprimer'
      });
    }

    res.json({
      success: true,
      code: 'PRODUCT_DELETED',
      message: 'Produit supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du produit:', error);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la suppression du produit'
    });
  }
});

module.exports = router;