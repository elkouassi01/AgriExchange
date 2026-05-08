// Alias — toute la logique est dans auth.js (source de vérité unique)
const { protect, authorize, generateToken } = require('./auth');
const User = require('../models/User');

/**
 * Vérifie si l'utilisateur est propriétaire d'une ressource (ou admin).
 * Uniquement pertinent pour les modèles Mongoose.
 */
const isOwner = (model, idPath = 'params.id') => {
  return async (req, res, next) => {
    try {
      const pathParts = idPath.split('.');
      let documentId = req;
      for (const part of pathParts) documentId = documentId?.[part];

      if (!documentId) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: `ID manquant dans ${idPath}` });
      }

      const document = await model.findById(documentId);
      if (!document) {
        return res.status(404).json({ code: 'RESOURCE_NOT_FOUND', message: 'Ressource introuvable' });
      }

      const ownerId = document.user || document.userId || document.ownerId || document.agriculteur || document.agriculteurId || null;
      if (!ownerId) {
        return res.status(500).json({ code: 'OWNER_FIELD_MISSING', message: 'Impossible de déterminer le propriétaire' });
      }

      const currentUserId = req.user?.id || req.user?._id;
      if (ownerId.toString() !== currentUserId?.toString() && req.user?.role !== 'admin') {
        return res.status(403).json({ code: 'OWNERSHIP_REQUIRED', message: 'Vous devez être propriétaire de cette ressource' });
      }

      req.document = document;
      next();
    } catch (error) {
      return res.status(500).json({ code: 'OWNERSHIP_CHECK_ERROR', message: 'Erreur lors de la vérification du propriétaire' });
    }
  };
};

module.exports = { protect, authorize, generateToken, isOwner };
