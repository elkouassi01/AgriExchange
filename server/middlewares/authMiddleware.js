const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const { isMysql } = require('../utils/authHelpers');

/**
 * 🔐 Middleware de protection des routes
 * Vérifie et décode le token JWT depuis cookie, Authorization ou query
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Recherche du token dans le cookie
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // 2️⃣ Si pas trouvé, vérifie l'en-tête Authorization
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 3️⃣ Sinon, regarde dans les query params (utile pour certaines requêtes)
    else if (req.query?.token) {
      token = req.query.token;
    }

    // Affichage du token tronqué (pour debug) en dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUTH] 🔑 Token reçu :', token ? `${token.slice(0, 15)}...` : '❌ Aucun');
    }

    if (!token) {
      return res.status(401).json({
        code: 'MISSING_TOKEN',
        message: 'Authentification requise',
        solution: 'Connectez-vous ou fournissez un token valide'
      });
    }

    // ✅ Vérification du token JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: error.name === 'TokenExpiredError' ? 'Session expirée' : 'Token invalide',
        details: error.message
      });
    }

    // 🔎 Récupération de l'utilisateur
    const utilisateur = isMysql()
      ? await mysqlUserRepository.findUserById(decoded.id || decoded.userId)
      : await User.findById(decoded.id || decoded.userId)
          .select('-motDePasse -password -__v -createdAt -updatedAt');

    if (!utilisateur) {
      return res.status(401).json({
        code: 'USER_NOT_FOUND',
        message: 'Compte introuvable',
        solution: 'Le compte associé à ce token n’existe plus'
      });
    }

    // ❌ Compte désactivé ou bloqué (optionnel selon ton schéma)
    if (utilisateur.status && utilisateur.status !== 'active') {
      return res.status(403).json({
        code: 'ACCOUNT_DISABLED',
        message: 'Compte désactivé',
        solution: 'Contactez l\'administrateur ou le support'
      });
    }

    // ✅ Injection de l'utilisateur et du token dans req
    req.user = utilisateur;
    req.token = token;

    next();
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AUTH] Erreur système :', err);
    }
    return res.status(500).json({
      code: 'AUTH_SYSTEM_ERROR',
      message: 'Erreur d\'authentification',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * 🛡 Middleware d'autorisation par rôle(s)
 * @param {string|string[]} roles - Un rôle ou une liste de rôles autorisés
 */
const authorize = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'UNAUTHORIZED',
        message: 'Accès refusé',
        requiredRoles: roles,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * 🔍 Vérifie si l'utilisateur est propriétaire d'une ressource (ou admin)
 * @param {mongoose.Model} model - Le modèle Mongoose concerné
 * @param {string} idPath - Chemin vers l'ID de la ressource dans req (ex: 'params.id')
 */
const isOwner = (model, idPath = 'params.id') => {
  return async (req, res, next) => {
    try {
      // 📌 Extraire l'ID du chemin donné
      const pathParts = idPath.split('.');
      let documentId = req;
      for (const part of pathParts) {
        documentId = documentId?.[part];
      }

      if (!documentId) {
        return res.status(400).json({
          code: 'BAD_REQUEST',
          message: `ID manquant dans ${idPath}`
        });
      }

      const document = await model.findById(documentId);
      if (!document) {
        return res.status(404).json({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Ressource introuvable'
        });
      }

      // 🧠 Recherche du champ propriétaire le plus probable
      const ownerId = document.user || document.userId || document.ownerId || document.agriculteur || document.agriculteurId || null;

      if (!ownerId) {
        return res.status(500).json({
          code: 'OWNER_FIELD_MISSING',
          message: 'Impossible de déterminer le propriétaire du document'
        });
      }

      const currentUserId = req.user.id || req.user._id;
      if (ownerId.toString() !== currentUserId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          code: 'OWNERSHIP_REQUIRED',
          message: 'Vous devez être propriétaire de cette ressource'
        });
      }

      req.document = document;
      next();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[OWNERSHIP CHECK ERROR]', error);
      }
      return res.status(500).json({
        code: 'OWNERSHIP_CHECK_ERROR',
        message: 'Erreur lors de la vérification du propriétaire'
      });
    }
  };
};

module.exports = {
  protect,
  authorize,
  isOwner
};
