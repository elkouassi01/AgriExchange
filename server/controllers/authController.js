const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Générer un token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30m' }
  );
};

// POST /api/v1/auth/connexion
exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    // Trouver utilisateur avec motDePasse sélectionné
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier mot de passe
    const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Générer token JWT
    const token = generateToken(user);

    // Supprimer motDePasse de la réponse
    const userData = user.toObject();
    delete userData.motDePasse;

    // Optionnel : envoyer token en cookie httpOnly
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 30, // 30 minutes
      sameSite: 'lax',
    });

    // Répondre avec utilisateur + token
    res.status(200).json({ utilisateur: userData, token });
  } catch (error) {
    console.error('[AUTH][LOGIN] Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/v1/auth/me
exports.getProfile = async (req, res) => {
  if (!req.utilisateur) {
    return res.status(401).json({ message: 'Non authentifié' });
  }
  res.status(200).json({ utilisateur: req.utilisateur });
};

// POST /api/v1/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('accessToken');
  res.status(200).json({ message: 'Déconnecté avec succès' });
};
