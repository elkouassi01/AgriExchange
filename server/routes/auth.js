const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middlewares/auth');
const sendSms = require('../utils/sendSms');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const { isMysql, sanitizeUser } = require('../utils/authHelpers');

router.post('/connexion', async (req, res) => {
  const { email, motDePasse } = req.body;
  if (!email || !motDePasse) {
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
  }

  try {
    const user = isMysql()
      ? await mysqlUserRepository.findUserByEmail(email)
      : await User.findOne({ email }).select('+motDePasse');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    const passwordMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }

    if (!user.estActif) {
      return res.status(403).json({ success: false, message: 'Compte desactive.' });
    }

    const userId = user.id || user._id;
    const token = jwt.sign(
      { id: userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1h' }
    );

    if (isMysql()) {
      await mysqlUserRepository.updateUserLastLogin(userId);
    }

    return res.status(200).json({
      success: true,
      message: 'Connexion reussie',
      utilisateur: sanitizeUser(user),
      token
    });
  } catch (error) {
    console.error('[Connexion] Erreur serveur :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur interne' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { telephone, otp } = req.body;
  if (!telephone || !otp) {
    return res.status(400).json({ message: 'Telephone et OTP requis' });
  }

  try {
    const user = isMysql()
      ? await mysqlUserRepository.findUserByContact(telephone)
      : await User.findOne({ contact: telephone });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ message: 'OTP incorrect' });
    }

    if (user.otpExpire && new Date(user.otpExpire).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP expire' });
    }

    if (isMysql()) {
      await mysqlUserRepository.markUserVerified(user.id || user._id);
    } else {
      user.isVerified = true;
      user.otp = null;
      user.otpExpire = null;
      await user.save();
    }

    return res.status(200).json({ message: 'Compte verifie avec succes !' });
  } catch (error) {
    console.error('[Verify OTP] Erreur serveur :', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

router.post('/resend-otp', async (req, res) => {
  const { telephone } = req.body;
  if (!telephone) {
    return res.status(400).json({ message: 'Telephone requis' });
  }

  try {
    const user = isMysql()
      ? await mysqlUserRepository.findUserByContact(telephone)
      : await User.findOne({ contact: telephone });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    const otp = generateOtp();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    if (isMysql()) {
      await mysqlUserRepository.updateUserOtp(user.id || user._id, String(otp), otpExpire);
    } else {
      user.otp = otp;
      user.otpExpire = otpExpire.getTime();
      await user.save();
    }

    await sendSms(telephone, `Votre code OTP est : ${otp}`);

    return res.status(200).json({ message: 'Nouveau code OTP envoye !' });
  } catch (error) {
    console.error('[Resend OTP] Erreur serveur :', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Session expiree' });
    }

    const user = isMysql()
      ? await mysqlUserRepository.findUserById(req.user.id || req.user._id)
      : await User.findById(req.user.id).select('-motDePasse');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouve' });
    }

    return res.status(200).json({
      success: true,
      utilisateur: sanitizeUser(user)
    });
  } catch (error) {
    console.error('[Me] Erreur serveur :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Deconnexion reussie (client-side uniquement)' });
});

router.get('/', (req, res) => {
  res.json({ status: 'active', message: 'API Auth operationnelle', timestamp: new Date().toISOString() });
});

module.exports = router;
