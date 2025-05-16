// server/routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products - Récupérer tous les produits avec filtres
router.get('/', async (req, res) => {
  try {
    const { categorie, search, minPrice, maxPrice, inStock } = req.query;
    const filter = {};

    // Filtres avancés
    if (categorie) filter.categorie = categorie;
    if (minPrice || maxPrice) {
      filter.prix = {};
      if (minPrice) filter.prix.$gte = Number(minPrice);
      if (maxPrice) filter.prix.$lte = Number(maxPrice);
    }
    if (inStock === 'true') filter.stock = { $gt: 0 };

    // Recherche textuelle (nom + description)
    if (search) {
      filter.$text = { $search: search };
    }

    const produits = await Product.find(filter)
      .sort({ createdAt: -1 }) // Tri par date décroissante
      .select('-__v'); // Exclure le champ __v

    // Ajouter le prix TTC virtuel à la réponse
    const result = produits.map(p => ({
      ...p.toObject(),
      prixTTC: p.prixTTC
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ 
      message: 'Erreur serveur',
      details: err.message 
    });
  }
});

// GET /api/products/:id - Récupérer un produit spécifique
router.get('/:id', async (req, res) => {
  try {
    const produit = await Product.findById(req.params.id)
      .select('-__v');

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json({
      ...produit.toObject(),
      prixTTC: produit.prixTTC
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Erreur serveur',
      details: err.message 
    });
  }
});

// POST /api/products - Créer un nouveau produit
router.post('/', async (req, res) => {
  try {
    const nouveauProduit = new Product({
      nom: req.body.nom,
      prix: req.body.prix,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      categorie: req.body.categorie,
      stock: req.body.stock || 0 // Valeur par défaut
    });

    const produitSauvegarde = await nouveauProduit.save();
    res.status(201).json({
      ...produitSauvegarde.toObject(),
      prixTTC: produitSauvegarde.prixTTC
    });
  } catch (err) {
    res.status(400).json({ 
      message: 'Données invalides',
      details: err.message 
    });
  }
});

// PATCH /api/products/:id - Mettre à jour partiellement un produit
router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    
    // Champs modifiables
    const allowedUpdates = ['nom', 'prix', 'description', 'imageUrl', 'categorie', 'stock'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const produitMaj = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!produitMaj) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json({
      ...produitMaj.toObject(),
      prixTTC: produitMaj.prixTTC
    });
  } catch (err) {
    res.status(400).json({ 
      message: 'Mise à jour échouée',
      details: err.message 
    });
  }
});

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', async (req, res) => {
  try {
    const produitSupprime = await Product.findByIdAndDelete(req.params.id);

    if (!produitSupprime) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json({ 
      message: 'Produit supprimé',
      produit: {
        ...produitSupprime.toObject(),
        prixTTC: produitSupprime.prixTTC
      }
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Erreur serveur',
      details: err.message 
    });
  }
});

// GET /api/products/:id/discount - Calculer prix remisé
router.get('/:id/discount', async (req, res) => {
  try {
    const { percent } = req.query;
    const produit = await Product.findById(req.params.id);

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (!percent || isNaN(percent)) {
      return res.status(400).json({ message: 'Pourcentage invalide' });
    }

    const prixRemise = produit.applyDiscount(Number(percent));
    res.json({
      prixOriginal: produit.prix,
      remise: `${percent}%`,
      prixRemise: prixRemise.toFixed(2)
    });
  } catch (err) {
    res.status(400).json({ 
      message: err.message,
      details: 'Le pourcentage doit être entre 0 et 100'
    });
  }
});

module.exports = router;
