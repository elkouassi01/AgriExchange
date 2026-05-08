const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendSms = require('../utils/sendSms');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const { isMysql, sanitizeUser } = require('../utils/authHelpers');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id || user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30m' }
  );
};

exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const user = isMysql()
      ? await mysqlUserRepository.findUserByEmail(email)
      : await User.findOne({ email }).select('+motDePasse');

    if (!user) return res.status(401).json({ message: 'Utilisateur non trouvé' });

    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!motDePasseValide) return res.status(401).json({ message: 'Mot de passe incorrect' });

    if (!user.isVerified && isMysql()) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await mysqlUserRepository.updateUserOtp(user.id, otp, otpExpire);
      await sendSms(user.contact, `Votre code OTP est : ${otp}`);
      return res.status(403).json({ message: 'Compte non vérifié. OTP envoyé par SMS.' });
    }

    if (!isMysql() && !user.isVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      user.otp = otp;
      user.otpExpire = Date.now() + 10 * 60 * 1000;
      await user.save();
      await sendSms(user.contact, `Votre code OTP est : ${otp}`);
      return res.status(403).json({ message: 'Compte non vérifié. OTP envoyé par SMS.' });
    }

    const token = generateToken(user);
    const userId = user.id || user._id;

    if (isMysql()) {
      await mysqlUserRepository.updateUserLastLogin(userId);
    } else {
      user.derniereConnexion = new Date();
      await user.save();
    }

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: 'Connexion reussie',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('[AUTH][LOGIN] Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { telephone, otp } = req.body;
  if (!telephone || !otp) return res.status(400).json({ message: 'Téléphone et OTP requis' });

  try {
    if (isMysql()) {
      const user = await mysqlUserRepository.findUserByContact(telephone);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      if (user.otp !== otp) return res.status(400).json({ message: 'OTP incorrect' });
      if (new Date(user.otpExpire) < new Date()) return res.status(400).json({ message: 'OTP expiré' });

      await mysqlUserRepository.markUserVerified(user.id);

      return res.status(200).json({ message: 'Compte vérifié avec succès !' });
    }

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

exports.resendOtp = async (req, res) => {
  const { telephone } = req.body;
  if (!telephone) return res.status(400).json({ message: 'Téléphone requis' });

  try {
    if (isMysql()) {
      const user = await mysqlUserRepository.findUserByContact(telephone);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      const otp = Math.floor(100000 + Math.random() * 900000);
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await mysqlUserRepository.updateUserOtp(user.id, otp, otpExpire);
      await sendSms(user.contact, `Votre code OTP est : ${otp}`);

      return res.status(200).json({ message: 'Nouveau code OTP envoyé !' });
    }

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

exports.getProfile = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
  res.status(200).json({ utilisateur: sanitizeUser(req.user) });
};

exports.updateProfile = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Non authentifié' });

  const { nom, contact, fermeNom, localisation, typeExploitation, surface, description } = req.body;
  const userId = req.user.id;

  const ALLOWED = {
    nom:              v => v && v.trim().length >= 2 && v.trim().length <= 50 ? v.trim() : null,
    contact:          v => v || null,
    ferme_nom:        v => fermeNom !== undefined ? (v || null) : undefined,
    localisation:     v => v || null,
    type_exploitation:v => v || null,
    surface:          v => v || null,
    description:      v => v || null,
  };

  const fieldMap = { nom, contact, ferme_nom: fermeNom, localisation, type_exploitation: typeExploitation, surface, description };
  const setClauses = [];
  const values = [];

  for (const [col, raw] of Object.entries(fieldMap)) {
    if (raw === undefined) continue;
    const sanitize = ALLOWED[col];
    const val = sanitize ? sanitize(raw) : raw;
    if (val === undefined) continue;
    setClauses.push(`${col} = ?`);
    values.push(val);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
  }

  try {
    const { getMysqlPool } = require('../config/mysql');
    const pool = getMysqlPool();
    values.push(userId);
    await pool.query(`UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    const updated = await mysqlUserRepository.findUserById(userId);
    res.json({ utilisateur: sanitizeUser(updated) });
  } catch (error) {
    console.error('[AUTH][UPDATE-PROFILE]', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Déconnecté avec succès' });
};