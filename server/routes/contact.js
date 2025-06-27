const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const authMiddleware = require('../middlewares/authMiddleware'); // Authentification

// 🔐 Route protégée - accessible uniquement aux consommateurs
router.get('/contact-fournisseur/:productId', authMiddleware.protect, async (req, res) => {
  try {
    const { role, _id } = req.user;
    const { productId } = req.params;

    // ✅ Vérifie que l'utilisateur est un consommateur
    if (role !== 'consommateur') {
      return res.status(403).json({ message: "Accès réservé aux consommateurs" });
    }

    // 🔍 Récupère le produit avec le vendeur (seulement nom, email, role)
    const produit = await Product.findById(productId).populate('sellerId', 'nom email role');

    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    const vendeur = produit.sellerId;

    // ✅ Vérifie que le vendeur est un agriculteur
    if (!vendeur || vendeur.role !== 'agriculteur') {
      return res.status(404).json({ message: "Fournisseur non valide ou introuvable" });
    }

    // ✅ Renvoie les infos de contact du vendeur
    return res.json({
      success: true,
      contactFournisseur: {
        nom: vendeur.nom,
        email: vendeur.email
      }
    });

  } catch (err) {
    console.error('Erreur récupération contact fournisseur:', err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
