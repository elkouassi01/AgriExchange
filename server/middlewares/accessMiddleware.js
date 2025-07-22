//middlewares/accessMiddleware.js
const User = require('../models/User');
const ProductView = require('../models/ProductView');
const moment = require('moment');

// Définir les quotas de vues par formule
const FORMULE_QUOTAS = {
  BLEU: 1,
  GOLD: 5,
  PLATINUM: Infinity  // Illimité
};

/**
 * Middleware pour vérifier l'accès à un produit
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Function} next - Fonction next
 */
exports.checkProductAccess = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const productId = req.params.productId;
    
    // 1. Vérifier que l'utilisateur existe
    const user = await User.findById(userId).populate('abonnement');
    if (!user) {
      return res.status(404).json({
        canAccess: false,
        message: "Utilisateur non trouvé"
      });
    }

    // 2. Vérifier le rôle
    if (user.role !== 'consommateur') {
      return res.status(403).json({
        canAccess: false,
        message: "Accès réservé aux consommateurs"
      });
    }

    // 3. Vérifier l'abonnement
    const abonnement = user.abonnement;
    
    // 3.1. Pas d'abonnement
    if (!abonnement) {
      return res.json({ 
        canAccess: false,
        message: "Vous n'avez pas d'abonnement actif"
      });
    }

    // 3.2. Abonnement inactif
    if (abonnement.statut !== 'actif') {
      return res.json({ 
        canAccess: false,
        message: "Votre abonnement n'est pas actif"
      });
    }

    // 3.3. Abonnement expiré
    const today = new Date();
    const endDate = new Date(abonnement.dateFin);
    
    if (endDate < today) {
      return res.json({ 
        canAccess: false,
        message: "Votre abonnement a expiré"
      });
    }

    // 4. Vérifier les quotas selon la formule
    const formule = abonnement.formule;
    const quota = FORMULE_QUOTAS[formule] || 0;

    // 4.1. Formule PLATINUM - accès illimité
    if (formule === 'PLATINUM') {
      return res.json({ 
        canAccess: true,
        message: "Accès illimité (Formule PLATINUM)"
      });
    }

    // 4.2. Formules limitées (BLEU/GOLD)
    // Calculer le début du mois en cours (premier jour du mois à 00:00:00)
    const startOfMonth = moment().startOf('month').toDate();
    
    // Compter les vues du mois en cours
    const viewsCount = await ProductView.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth }
    });

    // Vérifier si le quota est atteint
    if (viewsCount >= quota) {
      return res.json({ 
        canAccess: false,
        message: `Vous avez utilisé vos ${quota} vue${quota > 1 ? 's' : ''} ce mois-ci`
      });
    }

    // 5. Accès autorisé
    res.json({
      canAccess: true,
      message: "Accès autorisé",
      viewsRemaining: quota - viewsCount
    });

  } catch (error) {
    console.error("❌ Erreur dans checkProductAccess:", error);
    res.status(500).json({
      canAccess: false,
      message: "Erreur interne lors de la vérification d'accès"
    });
  }
};

/**
 * Middleware pour vérifier la propriété (utilisateur ou admin)
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Function} next - Fonction next
 */
exports.checkOwnership = (req, res, next) => {
  if (req.user._id === req.params.id || req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Accès refusé" });
};

/**
 * Middleware pour vérifier le rôle consommateur
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 * @param {Function} next - Fonction next
 */
exports.checkConsumerRole = (req, res, next) => {
  if (req.user.role === 'consommateur') {
    return next();
  }
  res.status(403).json({ message: "Accès réservé aux consommateurs" });
};