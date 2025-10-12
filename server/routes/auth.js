const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middlewares/auth');
const sendSms = require('../utils/sendSms');

// =============================================
// 🔐 CONNEXION UTILISATEUR
// =============================================
router.post('/connexion', async (req, res) => {
  const { email, motDePasse } = req.body;
  if (!email || !motDePasse) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

  try {
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) return res.status(401).json({ success: false, message: 'Identifiants invalides' });

    const passwordMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!passwordMatch) return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });

    if (!user.estActif) return res.status(403).json({ success: false, message: "Compte désactivé." });

    // ✅ Générer token JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      utilisateur: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        estActif: user.estActif,
        isVerified: user.isVerified
      },
      token
    });
  } catch (error) {
    console.error('[Connexion] Erreur serveur :', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur interne' });
  }
});

// =============================================
// ✅ VERIFICATION OTP SMS
// =============================================
router.post('/verify-otp', async (req, res) => {
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
    console.error('[Verify OTP] Erreur serveur :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =============================================
// 🔁 RENVOI OTP
// =============================================
const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

router.post('/resend-otp', async (req, res) => {
  const { telephone } = req.body;
  if (!telephone) return res.status(400).json({ message: 'Téléphone requis' });

  try {
    const user = await User.findOne({ contact: telephone });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    await sendSms(telephone, `Votre code OTP est : ${otp}`);

    res.status(200).json({ message: 'Nouveau code OTP envoyé !' });
  } catch (error) {
    console.error('[Resend OTP] Erreur serveur :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =============================================
// ✅ INFOS UTILISATEUR CONNECTÉ
// =============================================
router.get('/me', protect, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Session expirée' });
    const user = await User.findById(req.user.id).select('-motDePasse');
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    res.status(200).json({
      success: true,
      utilisateur: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        estActif: user.estActif,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('[Me] Erreur serveur :', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// =============================================
// 🚪 DECONNEXION UTILISATEUR
// =============================================
router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Déconnexion réussie (client-side uniquement)' });
});

// =============================================
// ✅ TEST DISPONIBILITE DE L'API AUTH
// =============================================
router.get('/', (req, res) => {
  res.json({ status: 'active', message: 'API Auth opérationnelle', timestamp: new Date().toISOString() });

});

module.exports = router;
