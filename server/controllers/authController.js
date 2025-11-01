const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sendSms = require('../utils/sendSms'); // fonction utilitaire pour envoyer SMS

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
    // Trouver utilisateur
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) return res.status(401).json({ message: 'Utilisateur non trouvé' });

    // Vérifier mot de passe
    const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isMatch) return res.status(401).json({ message: 'Mot de passe incorrect' });

    // Vérifier si l'utilisateur est confirmé par OTP
    if (!user.isVerified) {
      // Générer nouvel OTP
      const otp = Math.floor(100000 + Math.random() * 900000); // 6 chiffres
      user.otp = otp;
      user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      // Envoyer SMS
      await sendSms(user.contact, `Votre code OTP est : ${otp}`);

      return res.status(403).json({ message: 'Compte non vérifié. OTP envoyé par SMS.' });
    }

    // Générer token JWT
    const token = generateToken(user);

    // Supprimer motDePasse de la réponse
    const userData = user.toObject();
    delete userData.motDePasse;

    // Envoyer token en cookie httpOnly
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 30, // 30 minutes
      sameSite: 'lax',
    });

    res.status(200).json({ utilisateur: userData, token });
  } catch (error) {
    console.error('[AUTH][LOGIN] Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/v1/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  const { telephone, otp } = req.body;
  if (!telephone || !otp) return res.status(400).json({ message: 'Téléphone et OTP requis' });

  try {
    const user = await User.findOne({ contact: telephone });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if (user.otp !== otp) return res.status(400).json({ message: 'OTP incorrect' });
    if (user.otpExpire < Date.now()) return res.status(400).json({ message: 'OTP expiré' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    res.status(200).json({ message: 'Compte vérifié avec succès !' });
  } catch (error) {
    console.error('[AUTH][VERIFY-OTP] Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// POST /api/v1/auth/resend-otp
exports.resendOtp = async (req, res) => {
  const { telephone } = req.body;
  if (!telephone) return res.status(400).json({ message: 'Téléphone requis' });

  try {
    const user = await User.findOne({ contact: telephone });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendSms(user.contact, `Votre code OTP est : ${otp}`);

    res.status(200).json({ message: 'Nouveau code OTP envoyé !' });
  } catch (error) {
    console.error('[AUTH][RESEND-OTP] Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/v1/auth/me
exports.getProfile = async (req, res) => {
  if (!req.utilisateur) return res.status(401).json({ message: 'Non authentifié' });
  res.status(200).json({ utilisateur: req.utilisateur });
};

// POST /api/v1/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('accessToken');
  res.status(200).json({ message: 'Déconnecté avec succès' });
};
