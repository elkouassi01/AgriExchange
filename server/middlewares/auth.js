const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔧 Durées de validité des tokens
const TOKEN_EXPIRATION = process.env.JWT_EXPIRE || '7d';
const REFRESH_EXPIRATION = process.env.REFRESH_EXPIRE || '30d';

/**
 * 🔐 Middleware : Vérifie le token et injecte l'utilisateur dans req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ 1. Extraction du token : cookie > header > query
    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query?.token) {
      token = req.query.token;
    }

    // 🚫 2. Aucun token fourni
    if (!token) {
      console.warn('🚫 Aucun token détecté');
      return res.status(401).json({
        success: false,
        code: 'NO_TOKEN',
        message: 'Accès refusé. Veuillez vous connecter.'
      });
    }

    // ✅ 3. Vérification du token JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'AgriExchange API',
        audience: 'agriexchange-client'
      });
    } catch (error) {
      console.warn('⚠️ Erreur de vérification du token:', error.name);
      return res.status(401).json({
        success: false,
        code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: error.name === 'TokenExpiredError'
          ? 'Session expirée. Veuillez vous reconnecter.'
          : 'Token invalide ou corrompu.'
      });
    }

    // 🔎 4. Recherche de l'utilisateur
    const user = await User.findById(decoded.id).select('-motDePasse');
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.'
      });
    }

    // 🚫 5. Vérification si le compte est actif
    if (user.estActif === false) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: "Compte désactivé. Contactez l'administrateur."
      });
    }

    // ✅ 6. Tout est bon
    req.user = user;
    next();

  } catch (error) {
    console.error('[Protect Middleware] Erreur interne :', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Erreur serveur lors de l’authentification.'
    });
  }
};

/**
 * 🔐 Middleware : Autorisation par rôle(s)
 */
const authorize = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'Accès interdit à cette ressource.',
        ...(process.env.NODE_ENV === 'development' && {
          attendu: roles,
          trouvé: req.user?.role
        })
      });
    }
    next();
  };
};

/**
 * 🔑 Génère un token JWT (accès)
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRATION,
      issuer: 'AgriExchange API',
      audience: 'agriexchange-client'
    }
  );
};

/**
 * 🔁 Génère un token de rafraîchissement
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRATION,
      issuer: 'AgriExchange API',
      audience: 'agriexchange-client'
    }
  );
};

/**
 * ✅ Vérifie un token JWT (accès ou refresh)
 */
const verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh ? process.env.REFRESH_SECRET : process.env.JWT_SECRET;
    return jwt.verify(token, secret, {
      issuer: 'AgriExchange API',
      audience: 'agriexchange-client'
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Verify Token] Erreur :', error.name, error.message);
    }
    return null;
  }
};

module.exports = {
  protect,
  authorize,
  generateToken,
  generateRefreshToken,
  verifyToken
};
