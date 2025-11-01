const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');
const forfaitsConfig = require('../config/forfaits'); // Config forfaits (ex: maxContacts, durée, etc.)

// Route pour vérifier si un consommateur peut accéder aux contacts d'un produit (limite selon forfait)
router.get(
  '/products/:productId/can-access',
  authMiddleware.protect,
  async (req, res) => {
    try {
      // Récupération de l'utilisateur via req.user (injecté par middleware protect)
      const userId = req.user._id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" });
      }

      // Vérification du rôle consommateur
      if (user.role !== 'consommateur') {
        return res.status(403).json({ message: "Accès réservé aux consommateurs" });
      }

      // Vérification existence produit
      const productId = req.params.productId;
      const produit = await Product.findById(productId);
      if (!produit) {
        return res.status(404).json({ message: "Produit introuvable" });
      }

      // Vérification abonnement actif
      const abonnement = user.abonnement;
      if (!abonnement || abonnement.statut !== 'actif') {
        return res.status(403).json({ message: "Abonnement inactif ou inexistant" });
      }

      // Récupération des détails forfaits côté consommateur
      const forfait = abonnement.formule;
      const forfaitDetails = forfaitsConfig['consommateur'][forfait];

      if (!forfaitDetails) {
        return res.status(500).json({ message: "Erreur configuration forfait" });
      }

      // Calcul début mois pour filtrer vues du mois courant
      const maintenant = new Date();
      const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

      // Filtrage des vues du mois courant (uniques sur productId)
      const vuesCeMois = user.productViews.filter(v => v.viewedAt >= debutMois);

      // Vérifier la limite max de consultations selon forfait
      if (vuesCeMois.length >= forfaitDetails.maxContacts) {
        return res.status(403).json({
          message: "Vous avez atteint votre limite mensuelle de consultations de produits."
        });
      }

      // Vérifier si le produit a déjà été vu ce mois-ci
      const dejaVu = vuesCeMois.some(v => v.productId.equals(productId));

      if (!dejaVu) {
        // Ajouter la vue produit dans l'historique
        user.productViews.push({ productId, viewedAt: maintenant });
        await user.save();
      }

      // Accès autorisé
      return res.json({ accessGranted: true });

    } catch (err) {
      console.error("Erreur vérification accès produit :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

module.exports = router;
