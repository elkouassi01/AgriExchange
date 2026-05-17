const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const Product = require('../models/Product');
const { protect, authorize } = require('../middlewares/auth');
const { upload, cloudinary } = require('../config/upload');
const mysqlProductRepository = require('../repositories/mysqlProductRepository');
const sponsoredRepo = require('../repositories/mysqlSponsoredRepository');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const notificationService = require('../utils/notificationService');
const { isMysql } = require('../utils/authHelpers');

const cinetpay = require('../utils/cinetpayService');

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try { return JSON.parse(value); } catch { return []; }
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
    imageUrl: imageUrl || null,
    images: parseJsonArray(images),
  };
};

const resolveImageUrl = async (req, fallbackImageUrl) => {
  let finalImageUrl = fallbackImageUrl || null;

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

      // Notifier tous les admins via WhatsApp + Email + message in-app
      const admins = await mysqlUserRepository.getAdmins().catch(() => []);
      const sellerNom = req.user.nom || req.user.name || 'un agriculteur';
      const adminMessage =
        `📦 Nouvelle denrée soumise\n\n` +
        `Denrée : ${payload.nom}\n` +
        `Agriculteur : ${sellerNom}\n` +
        `Prix : ${Number(payload.prix).toLocaleString('fr-FR')} FCFA\n\n` +
        `📋 Panel admin : https://vivrimarket.com/admin/moderation`;

      for (const admin of admins) {
        await notificationService.sendByPhone(
          admin.contact,
          '🌿 Nouvelle denrée en attente',
          adminMessage,
          { channels: ['whatsapp', 'email', 'inapp'] }
        ).catch(err => console.error('[NotifyAdmin]', err.message));
      }

      return res.status(201).json({
        success: true,
        code: 'PRODUCT_CREATED',
        message: 'Denrée soumise avec succès ! Elle sera visible après validation par un administrateur.',
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
      message: 'Denrée ajoutée avec succès !',
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
        message: 'Données de la denrée invalides',
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
      message: "Erreur serveur lors de l'ajout de la denrée",
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
        { onlyInStock: true, onlyApproved: true }
      );

      return res.json({
        success: true,
        code: 'PRODUCTS_FETCHED',
        message: 'Denrées récupérées avec succès',
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
      message: 'Denrées récupérées avec succès',
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
    console.error('Erreur récupération denrées:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la récupération des denrées',
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
        message: 'Vos denrées ont été récupérées avec succès',
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
      message: 'Vos denrées ont été récupérées avec succès',
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
    console.error('Erreur récupération denrées utilisateur:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la récupération de vos denrées'
    });
  }
});

// GET /products/sponsored — liste publique des produits mis en avant (max 8)
router.get('/sponsored', async (req, res) => {
  try {
    if (!isMysql()) return res.json({ success: true, products: [] });
    let products = await mysqlProductRepository.getSponsoredProducts(8);
    if (!products.length) {
      products = await mysqlProductRepository.getRecentApprovedProducts(8);
    }
    return res.json({ success: true, products });
  } catch (err) {
    console.error('[sponsored]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /products/:id/sponsor — activer / désactiver la sponsorisation
const SPONSOR_LIMITS = { BLEU: 1, GOLD: 3, PLATINUM: 5 };

router.put('/:id/sponsor', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    if (!isMysql()) return res.status(501).json({ success: false, message: 'Non disponible' });

    const sellerId = req.user.id || req.user._id;
    const { activate } = req.body; // boolean

    if (activate) {
      // Vérifier l'abonnement actif via user_subscriptions (source de vérité pour agriculteurs)
      const abonnement = await mysqlUserRepository.getActiveSubscriptionForUser(sellerId);
      // Vérifier que l'abonnement existe, est actif, et n'est pas expiré
      if (!abonnement || abonnement.statut !== 'actif' || new Date(abonnement.dateFin) < new Date()) {
        return res.status(403).json({ success: false, message: 'Abonnement actif requis pour sponsoriser une denrée.' });
      }
      const limit = SPONSOR_LIMITS[abonnement.formule] ?? 1;
      const current = await mysqlProductRepository.countSponsoredBySeller(sellerId);
      if (current >= limit) {
        return res.status(403).json({
          success: false,
          limitReached: true,
          paymentAvailable: true,
          message: `Limite atteinte (${limit} denrée${limit > 1 ? 's' : ''} sponsorisée${limit > 1 ? 's' : ''} max avec le plan ${abonnement.formule}).`,
          limit,
          current,
          sponsorAmount: sponsoredRepo.SPONSOR_AMOUNT,
          sponsorDays:   sponsoredRepo.SPONSOR_DURATION_DAYS,
        });
      }
    }

    const updated = await mysqlProductRepository.toggleSponsor(req.params.id, sellerId, activate);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Denrée introuvable ou non autorisée.' });
    }
    return res.json({ success: true, isFeatured: Boolean(activate) });
  } catch (err) {
    console.error('[sponsor toggle]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /products/:id/sponsor/initiate — paiement CinetPay 5 000 FCFA / 2 semaines
router.post('/:id/sponsor/initiate', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    if (!isMysql()) return res.status(501).json({ success: false, message: 'Non disponible' });

    const sellerId  = req.user.id || req.user._id;
    const productId = req.params.id;

    // Vérifier que le produit appartient à ce vendeur
    const product = await mysqlProductRepository.findProductById(productId);
    if (!product || String(product.sellerId) !== String(sellerId)) {
      return res.status(404).json({ success: false, message: 'Denrée introuvable' });
    }

    const { randomUUID } = require('crypto');
    const transactionId = `SP${randomUUID().replace(/-/g, '').toUpperCase()}`;
    const origin    = req.headers.origin || process.env.CLIENT_URL || 'https://vivrimarket.com';
    const serverUrl = process.env.SERVER_URL || 'https://vivrimarket.com';

    const nameParts = (req.user.nom || 'Agriculteur').substring(0, 50).split(' ');
    const result = await cinetpay.initPayment({
      merchantTransactionId: transactionId,
      amount:         sponsoredRepo.SPONSOR_AMOUNT,
      designation:    `Sponsoring denrée "${product.nom}" — ${sponsoredRepo.SPONSOR_DURATION_DAYS} jours`,
      clientFirstName: nameParts[0] || 'Agriculteur',
      clientLastName:  nameParts.slice(1).join(' ') || '-',
      clientEmail:    req.user.email || 'agriculteur@vivrimarket.com',
      clientPhone:    req.user.contact || '',
      successUrl:     `${origin}/mes-produits?sponsor_tx=${transactionId}&sponsor_pid=${productId}`,
      failedUrl:      `${origin}/mes-produits`,
      notifyUrl:      `${serverUrl}/api/v1/products/sponsor/webhook`,
    });

    if (result.payment_url) {
      await sponsoredRepo.createPending(productId, sellerId, transactionId);
      return res.json({
        success:        true,
        payment_url:    result.payment_url,
        transaction_id: transactionId,
        amount:         sponsoredRepo.SPONSOR_AMOUNT,
        days:           sponsoredRepo.SPONSOR_DURATION_DAYS,
      });
    }

    return res.status(400).json({ success: false, message: result.message || 'Erreur paiement' });
  } catch (err) {
    console.error('[sponsor initiate]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /products/:id/sponsor/check?tx_id=xxx — vérifie le paiement et active la sponsorisation
router.get('/:id/sponsor/check', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    if (!isMysql()) return res.status(501).json({ success: false, message: 'Non disponible' });

    const { tx_id } = req.query;
    if (!tx_id) return res.status(400).json({ success: false, message: 'tx_id requis' });

    // Vérifier auprès de CinetPay
    const verifyResult = await cinetpay.checkPayment(tx_id);
    const paid = cinetpay.isAccepted(verifyResult);

    if (!paid) return res.json({ success: false, paid: false });

    const record = await sponsoredRepo.activateSponsor(tx_id);
    if (!record) return res.status(404).json({ success: false, message: 'Paiement introuvable' });

    return res.json({
      success:  true,
      paid:     true,
      endDate:  record.end_date,
    });
  } catch (err) {
    console.error('[sponsor check]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /products/sponsor/webhook — notification CinetPay async (idempotent)
router.post('/sponsor/webhook', async (req, res) => {
  try {
    const txId = req.body.transaction_id || req.body.cpm_trans_id;
    if (!txId) return res.status(400).send('Missing transaction_id');

    const verifyResult = await cinetpay.checkPayment(txId);
    const accepted = cinetpay.isAccepted(verifyResult);

    if (accepted && isMysql()) {
      await sponsoredRepo.activateSponsor(txId);
    }
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[sponsor webhook]', err.message);
    return res.status(500).send('Error');
  }
});

// GET /products/my-stats — agrégation des statistiques du vendeur connecté
router.get('/my-stats', protect, authorize(['agriculteur', 'farmer']), async (req, res) => {
  try {
    const sellerId = req.user.id || req.user._id;
    if (!isMysql()) return res.json({ success: true, stats: null });
    const stats = await mysqlProductRepository.getSellerStats(sellerId);
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[my-stats]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
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
          message: 'Denrée introuvable'
        });
      }

      // Strip seller contact info — gated behind 300 FCFA payment (see /api/v1/product-payments)
      const publicProduct = {
        ...product,
        vendeur: product.vendeur
          ? { nom: product.vendeur.nom, fermeNom: product.vendeur.fermeNom }
          : null,
      };

      return res.json({
        success: true,
        code: 'PRODUCT_FETCHED',
        message: 'Denrée récupérée avec succès',
        data: { product: publicProduct }
      });
    }

    const product = await Product.findById(req.params.id)
      .populate({ path: 'vendeur', select: 'nom email contact fermeNom rating adresse description' });

    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: 'Denrée introuvable'
      });
    }

    return res.json({
      success: true,
      code: 'PRODUCT_FETCHED',
      message: 'Denrée récupérée avec succès',
      data: { product }
    });
  } catch (error) {
    console.error('Erreur récupération denrée:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la récupération de la denrée'
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
          message: "Denrée introuvable ou vous n'êtes pas autorisé à la modifier"
        });
      }

      return res.json({
        success: true,
        code: 'PRODUCT_UPDATED',
        message: 'Denrée modifiée avec succès',
        data: { product: updatedProduct }
      });
    }

    const product = await Product.findOne({ _id: req.params.id, sellerId });
    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: "Denrée introuvable ou vous n'êtes pas autorisé à la modifier"
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
      message: 'Denrée modifiée avec succès',
      data: { product: updatedProduct }
    });
  } catch (error) {
    console.error('Erreur modification denrée:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la modification de la denrée'
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
          message: "Denrée introuvable ou vous n'êtes pas autorisé à la supprimer"
        });
      }

      return res.json({
        success: true,
        code: 'PRODUCT_DELETED',
        message: 'Denrée supprimée avec succès'
      });
    }

    const product = await Product.findOneAndDelete({ _id: req.params.id, sellerId });
    if (!product) {
      return res.status(404).json({
        success: false,
        code: 'PRODUCT_NOT_FOUND',
        message: "Denrée introuvable ou vous n'êtes pas autorisé à la supprimer"
      });
    }

    return res.json({
      success: true,
      code: 'PRODUCT_DELETED',
      message: 'Denrée supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur suppression denrée:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de la suppression de la denrée'
    });
  }
});

// Helper : traite un buffer image → Cloudinary
const uploadImageBuffer = async (buffer) => {
  const processed = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'farm_products' }, (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      })
      .end(processed);
  });
};

// POST /products/:id/images — ajoute des photos à la galerie d'un produit
router.post(
  '/:id/images',
  upload.array('images', 4),
  protect,
  authorize(['agriculteur', 'farmer']),
  async (req, res) => {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune image fournie' });
    }

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const url = await uploadImageBuffer(file.buffer);
        uploadedUrls.push(url);
      }

      if (isMysql()) {
        await mysqlProductRepository.addProductImages(req.params.id, uploadedUrls);
      }

      return res.json({ success: true, images: uploadedUrls });
    } catch (err) {
      console.error('[product images upload]', err);
      return res.status(500).json({ success: false, message: "Erreur lors de l'upload des images" });
    }
  }
);

// DELETE /products/:id/images/:imageId — supprime une photo de la galerie
router.delete(
  '/:id/images/:imageId',
  protect,
  authorize(['agriculteur', 'farmer']),
  async (req, res) => {
    try {
      const sellerId = req.user.id || req.user._id;
      if (isMysql()) {
        const deleted = await mysqlProductRepository.deleteProductImage(
          req.params.id,
          req.params.imageId,
          sellerId
        );
        if (!deleted) {
          return res.status(404).json({ success: false, message: 'Image non trouvée' });
        }
      }
      return res.json({ success: true, message: 'Image supprimée' });
    } catch (err) {
      console.error('[delete product image]', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
);

module.exports = router;
