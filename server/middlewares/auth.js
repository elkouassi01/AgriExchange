const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TOKEN_EXPIRATION = process.env.JWT_EXPIRE || '7d';
const REFRESH_EXPIRATION = process.env.REFRESH_EXPIRE || '30d';

const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Extraction
    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('AUTH HEADER REÇU :', req.headers.authorization);
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      console.warn('🚫 Aucun token détecté');
      return res.status(401).json({
        success: false,
        code: 'NO_TOKEN',
        message: 'Accès refusé. Veuillez vous connecter.'
      });
    }

    // 2. Vérification SANS issuer/audience
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET); // <-- CORRIGÉ
      console.log('TOKEN DÉCODÉ :', decoded);
    } catch (err) {
      console.warn('⚠️ Erreur de vérification du token:', err.name);
      return res.status(401).json({
        success: false,
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: err.name === 'TokenExpiredError'
          ? 'Session expirée. Veuillez vous reconnecter.'
          : 'Token invalide ou corrompu.'
      });
    }

    // 3. Utilisateur
    const user = await User.findById(decoded.id).select('-motDePasse');
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.'
      });
    }
    if (user.estActif === false) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: "Compte désactivé. Contactez l'administrateur."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Protect] Erreur interne :', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de l’authentification.'
    });
  }
};

const authorize = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'Accès interdit à cette ressource.'
      });
    }
    next();
  };
};

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRATION,
      issuer: 'AgriExchange API',        // <-- conservé côté génération
      audience: 'agriexchange-client'
    }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRATION,
      issuer: 'AgriExchange API',
      audience: 'agriexchange-client'
    }
  );

module.exports = {
  protect,
  authorize,
  generateToken,
  generateRefreshToken
};