const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const Product = require('../models/Product');
const { protect, authorize } = require('../middlewares/auth');
const { upload, cloudinary } = require('../config/upload');
const mysqlProductRepository = require('../repositories/mysqlProductRepository');
const { isMysql } = require('../utils/authHelpers');

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    return JSON.parse(value);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const buildValidatedPayload = (req) => {
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

  const champsObligatoires = { nom, prix, categorie, stock, unite, dateRecolte };
  const champsManquants = Object.keys(champsObligatoires)
    .filter((champ) => !champsObligatoires[champ] && champsObligatoires[champ] !== 0);

  if (champsManquants.length > 0) {
    const error = new Error(`Champs obligatoires manquants: ${champsManquants.join(', ')}`);
    error.status = 400;
    error.code = 'MISSING_FIELDS';
    throw error;
  }

  if (parseFloat(prix) <= 0) {
    const error = new Error('Le prix doit etre superieur a 0');
    error.status = 400;
    error.code = 'INVALID_PRICE';
    throw error;
  }

  if (parseInt(stock, 10) < 0) {
    const error = new Error('Le stock ne peut pas etre negatif');
    error.status = 400;
    error.code = 'INVALID_STOCK';
    throw error;
  }

  return {
    nom: String(nom).trim(),
    prix: parseFloat(prix),
    description: description || '',
    categorie: String(categorie).toLowerCase(),
    stock: parseInt(stock, 10),
    unite: String(unite).toLowerCase(),
    dateRecolte: new Date(dateRecolte),
    mensurations: mensurations || '',
    etat: String(etat || 'frais').toLowerCase(),
    tags: parseJsonArray(tags),
    certifications: parseJsonArray(certifications),
    imageUrl: imageUrl || 'https://via.placeholder.com/150',
    images: parseJsonArray(images),
  };
};

const resolveImageUrl = async (req, fallbackImageUrl) => {
  let finalImageUrl = fallbackImageUrl || 'https://via.placeholder.com/150';

  if (!req.file) {
    return finalImageUrl;
  }

  const buffer = await sharp(req.file.buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const uploadRes = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'farm_products' }, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      })
      .end(buffer);
  });

  return uploadRes.secure_url;
};

router.post('/add', upload.single('imageFile'), protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const payload = buildValidatedPayload(req);
    payload.imageUrl = await resolveImageUrl(req, payload.imageUrl);
    payload.sellerId = req.user.id || req.user._id;

    if (isMysql()) {
      const createdProduct = await mysqlProductRepository.createProduct(payload);
      return res.status(201).json({
        success: true,
        code: 'PRODUCT_CREATED',
        message: 'Produit ajoute avec succes !',
        product: createdProduct
      });
    }

    const nouveauProduit = new Product({
      ...payload,
      sellerId: payload.sellerId
    });

    const produitSauvegarde = await nouveauProduit.save();
    await produitSauvegarde.populate({
      path: 'vendeur',
      select: 'nom email contact fermeNom rating'
    });

    return res.status(201).json({
      success: true,
      code: 'PRODUCT_CREATED',
      message: 'Produit ajoute avec succes !',
      product: produitSauvegarde
    });
  } catch (error) {
    console.error('Erreur ajout produit:', error);

    if (error.status) {
      return res.status(error.status).json({
        success: false,
        code: error.code || 'VALIDATION_ERROR',
        message: error.message
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Donnees du produit invalides',
        errors
      });
    }

    if (error.http_code >= 400) {
      return res.status(502).json({
        success: false,
        code: 'UPLOAD_FAILED',
        message: "Echec de l'upload de l'image",
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: "Erreur serveur lors de l'ajout du produit",
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    });
  }
});

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

    if (isMysql()) {
      const result = await mysqlProductRepository.listProducts(
        { page, limit, categorie, etat, minPrix, maxPrix, search, sortBy, sortOrder },
        { onlyInStock: true }
      );

      return res.json({
        success: true,
        code: 'PRODUCTS_FETCHED',
        message: 'Produits recuperes avec succes',
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
    }

    const filter = { stock: { $gt: 0 } };
    if (categorie) filter.categorie = categorie.toLowerCase();
    if (etat) filter.etat = etat.toLowerCase();
    if (minPrix || maxPrix) {
      filter.prix = {};
      if (minPrix) filter.prix.$gte = parseFloat(minPrix);
      if (maxPrix) filter.prix.$lte = parseFloat(maxPrix);
    }
    if (search && search.trim() !== '') filter.$text = { $search: search.trim() };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10) > 50 ? 50 : parseInt(limit, 10),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: { path: 'vendeur', select: 'nom email contact fermeNom rating' }
    };

    const result = await Product.paginate(filter, options);
    return res.json({
      success: true,
      code: 'PRODUCTS_FETCHED',
      message: 'Produits recuperes avec succes',
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
    console.error('Erreur recuperation produits:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la recuperation des produits',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

router.get('/my-products', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const { page = 1, limit = 10, includeOutOfStock = false } = req.query;
    const sellerId = req.user.id || req.user._id;

    if (isMysql()) {
      const result = await mysqlProductRepository.listProducts(
        { page, limit, sellerId, sortBy: 'createdAt', sortOrder: 'desc' },
        { onlyInStock: includeOutOfStock !== 'true' }
      );

      return res.json({
        success: true,
        code: 'USER_PRODUCTS_FETCHED',
        message: 'Vos produits ont ete recuperes avec succes',
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
    }

    const filter = { sellerId };
    if (includeOutOfStock !== 'true') filter.stock = { $gt: 0 };

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      populate: { path: 'vendeur', select: 'nom email contact fermeNom rating' }
    };

    const result = await Product.paginate(filter, options);
    return res.json({
      success: true,
      code: 'USER_PRODUCTS_FETCHED',
      message: 'Vos produits ont ete recuperes avec succes',
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
    console.error('Erreur recuperation produits utilisateur:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la recuperation de vos produits'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (isMysql()) {
      const product = await mysqlProductRepository.findProductById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          message: 'Produit non trouve'
        });
      }

      return res.json({
        success: true,
        code: 'PRODUCT_FETCHED',
        message: 'Produit recupere avec succes',
        data: { product }
      });
    }

    const product = await Product.findById(req.params.id)
      .populate({ path: 'vendeur', select: 'nom email contact fermeNom rating adresse description' });

    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produit non trouve'
      });
    }

    return res.json({
      success: true,
      code: 'PRODUCT_FETCHED',
      message: 'Produit recupere avec succes',
      data: { product }
    });
  } catch (error) {
    console.error('Erreur recuperation produit:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la recuperation du produit'
    });
  }
});

router.put('/:id', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const sellerId = req.user.id || req.user._id;

    if (isMysql()) {
      const updates = {};
      const allowedUpdates = [
        'nom', 'prix', 'description', 'categorie', 'stock', 'unite',
        'dateRecolte', 'mensurations', 'etat', 'tags', 'certifications',
        'imageUrl', 'images'
      ];

      allowedUpdates.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(req.body, key)) return;

        if (key === 'prix') updates.prix = parseFloat(req.body.prix);
        else if (key === 'stock') updates.stock = parseInt(req.body.stock, 10);
        else if (key === 'categorie' || key === 'unite' || key === 'etat') updates[key] = String(req.body[key]).toLowerCase();
        else if (key === 'dateRecolte') updates.dateRecolte = new Date(req.body.dateRecolte);
        else if (key === 'tags' || key === 'certifications' || key === 'images') updates[key] = parseJsonArray(req.body[key]);
        else updates[key] = req.body[key];
      });

      if (req.file) {
        updates.imageUrl = await resolveImageUrl(req, req.body.imageUrl || '');
      }

      const updatedProduct = await mysqlProductRepository.updateProduct(req.params.id, sellerId, updates);
      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          message: "Produit non trouve ou vous n'etes pas autorise a le modifier"
        });
      }

      return res.json({
        success: true,
        code: 'PRODUCT_UPDATED',
        message: 'Produit modifie avec succes',
        data: { product: updatedProduct }
      });
    }

    const product = await Product.findOne({ _id: req.params.id, sellerId });
    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: "Produit non trouve ou vous n'etes pas autorise a le modifier"
      });
    }

    const allowedUpdates = [
      'nom', 'prix', 'description', 'categorie', 'stock', 'unite',
      'dateRecolte', 'mensurations', 'etat', 'tags', 'certifications',
      'imageUrl', 'images'
    ];

    const updates = Object.keys(req.body)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    Object.keys(updates).forEach((key) => { product[key] = updates[key]; });

    const updatedProduct = await product.save();
    await updatedProduct.populate({ path: 'vendeur', select: 'nom email contact fermeNom rating' });

    return res.json({
      success: true,
      code: 'PRODUCT_UPDATED',
      message: 'Produit modifie avec succes',
      data: { product: updatedProduct }
    });
  } catch (error) {
    console.error('Erreur modification produit:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la modification du produit'
    });
  }
});

router.delete('/:id', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const sellerId = req.user.id || req.user._id;

    if (isMysql()) {
      const deleted = await mysqlProductRepository.deleteProduct(req.params.id, sellerId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          message: "Produit non trouve ou vous n'etes pas autorise a le supprimer"
        });
      }

      return res.json({
        success: true,
        code: 'PRODUCT_DELETED',
        message: 'Produit supprime avec succes'
      });
    }

    const product = await Product.findOneAndDelete({ _id: req.params.id, sellerId });
    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: "Produit non trouve ou vous n'etes pas autorise a le supprimer"
      });
    }

    return res.json({
      success: true,
      code: 'PRODUCT_DELETED',
      message: 'Produit supprime avec succes'
    });
  } catch (error) {
    console.error('Erreur suppression produit:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la suppression du produit'
    });
  }
});

module.exports = router;
