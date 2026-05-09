const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middlewares/auth');
const { sendWhatsApp } = require('../utils/whatsappClient');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const { isMysql, sanitizeUser } = require('../utils/authHelpers');
const { upload, cloudinary } = require('../config/upload');
const sharp = require('sharp');

const sendOtpWhatsApp = async (phone, otp) => {
  const msg =
    `🔐 *VivriMarket* — Code de vérification\n\n` +
    `Votre code OTP est : *${otp}*\n\n` +
    `Ce code expire dans *10 minutes*.\n` +
    `Ne le partagez avec personne.`;
  await sendWhatsApp(phone, msg).catch((e) => console.error('[OTP WA]', e.message));
};

const otpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 3,
  keyGenerator: (req) => req.body.telephone || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Trop de demandes OTP. Réessayez dans 10 minutes.',
    });
  },
  skipSuccessfulRequests: false,
});

const verifyOtpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 5,
  keyGenerator: (req) => req.body.telephone || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Trop de tentatives. Réessayez dans 10 minutes.',
    });
  },
});

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

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

router.post('/verify-otp', verifyOtpRateLimit, async (req, res) => {
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

router.post('/resend-otp', otpRateLimit, async (req, res) => {
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

    await sendOtpWhatsApp(telephone, otp);

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

router.get('/mes-contacts', protect, async (req, res) => {
  try {
    const { getMysqlPool } = require('../config/mysql');
    const pool = getMysqlPool();
    const email   = req.user.email   || '';
    const contact = req.user.contact || '';

    const [rows] = await pool.query(
      `SELECT cr.id, cr.product_id, cr.product_nom, cr.seller_phone,
              cr.status, cr.expires_at,
              u.nom AS seller_nom
       FROM contact_requests cr
       LEFT JOIN users u ON u.id = cr.seller_id
       WHERE cr.buyer_email = ? OR cr.buyer_phone = ?
       ORDER BY cr.expires_at DESC
       LIMIT 50`,
      [email, contact]
    );

    const PRIX_CONTACT = 300;
    const actifs  = rows.filter(r => r.status !== 'expired' && r.status !== 'refunded');
    const depense = rows.filter(r => r.status !== 'refunded').length * PRIX_CONTACT;

    return res.json({
      contacts: rows,
      stats: {
        total:   rows.length,
        actifs:  actifs.length,
        depense,
      },
    });
  } catch (error) {
    console.error('[mes-contacts]', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/profil', protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Non authentifié' });

  const { nom, contact, fermeNom, localisation, typeExploitation, surface, description } = req.body;
  const userId = req.user.id || req.user._id;

  const fieldMap = {
    nom:               nom,
    contact:           contact,
    ferme_nom:         fermeNom,
    localisation:      localisation,
    type_exploitation: typeExploitation,
    surface:           surface,
    description:       description,
  };

  const setClauses = [];
  const values = [];
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val === undefined) continue;
    setClauses.push(`${col} = ?`);
    values.push(val || null);
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
    return res.json({ success: true, utilisateur: sanitizeUser(updated) });
  } catch (error) {
    console.error('[Profil PUT]', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
  }
});

// Mot de passe oublié — envoie un OTP via WhatsApp
router.post('/forgot-password', otpRateLimit, async (req, res) => {
  const { telephone } = req.body;
  if (!telephone) {
    return res.status(400).json({ success: false, message: 'Numéro de téléphone requis' });
  }

  try {
    const user = isMysql()
      ? await mysqlUserRepository.findUserByContact(telephone)
      : await User.findOne({ contact: telephone });

    // On ne révèle pas si le numéro existe — réponse identique dans tous les cas
    if (user) {
      const otp = generateOtp();
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

      if (isMysql()) {
        await mysqlUserRepository.updateUserOtp(user.id, String(otp), otpExpire);
      } else {
        user.otp = otp;
        user.otpExpire = otpExpire.getTime();
        await user.save();
      }

      const msg =
        `🔐 *VivriMarket* — Réinitialisation de mot de passe\n\n` +
        `Votre code de réinitialisation est : *${otp}*\n\n` +
        `Ce code expire dans *10 minutes*.\n` +
        `Ne le partagez avec personne.`;
      await sendWhatsApp(telephone, msg).catch((e) => console.error('[Reset OTP WA]', e.message));
    }

    return res.json({ success: true, message: 'Si ce numéro est enregistré, vous recevrez un code WhatsApp.' });
  } catch (error) {
    console.error('[Forgot Password]', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Réinitialisation du mot de passe avec OTP
router.post('/reset-password', async (req, res) => {
  const { telephone, otp, nouveauMotDePasse } = req.body;
  if (!telephone || !otp || !nouveauMotDePasse) {
    return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
  }

  if (nouveauMotDePasse.length < 6) {
    return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const user = isMysql()
      ? await mysqlUserRepository.findUserByContact(telephone)
      : await User.findOne({ contact: telephone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Numéro introuvable' });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Code OTP incorrect' });
    }

    if (user.otpExpire && new Date(user.otpExpire).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Code OTP expiré. Demandez un nouveau code.' });
    }

    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 12);

    if (isMysql()) {
      await mysqlUserRepository.updateUserPassword(user.id, hashedPassword);
    } else {
      user.motDePasse = hashedPassword;
      user.otp = null;
      user.otpExpire = null;
      await user.save();
    }

    return res.json({ success: true, message: 'Mot de passe mis à jour avec succès !' });
  } catch (error) {
    console.error('[Reset Password]', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Upload photo de profil
router.post('/photo-profil', protect, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucune image fournie' });

  try {
    const userId = req.user.id || req.user._id;

    const buffer = await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const photoUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'profils', public_id: `user_${userId}`, overwrite: true },
        (err, result) => (err ? reject(err) : resolve(result.secure_url))
      );
      stream.end(buffer);
    });

    const pool = require('../config/mysql').getMysqlPool();
    await pool.query('UPDATE users SET photo = ?, updated_at = NOW() WHERE id = ?', [photoUrl, userId]);

    const updated = await mysqlUserRepository.findUserById(userId);
    return res.json({ success: true, photo: photoUrl, utilisateur: sanitizeUser(updated) });
  } catch (error) {
    console.error('[Photo Profil]', error);
    return res.status(500).json({ message: "Erreur lors de l'upload de la photo" });
  }
});

// Suppression photo de profil
router.delete('/photo-profil', protect, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const pool = require('../config/mysql').getMysqlPool();

    // Supprimer de Cloudinary si possible (best-effort)
    try {
      await cloudinary.uploader.destroy(`profils/user_${userId}`);
    } catch { /* ignore */ }

    await pool.query('UPDATE users SET photo = NULL, updated_at = NOW() WHERE id = ?', [userId]);
    const updated = await mysqlUserRepository.findUserById(userId);
    return res.json({ success: true, utilisateur: sanitizeUser(updated) });
  } catch (error) {
    console.error('[Delete Photo]', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.status(200).json({ success: true, message: 'Déconnexion réussie' });
});

// Inscription consommateur avec OTP WhatsApp
router.post('/inscription-consommateur', otpRateLimit, async (req, res) => {
  const { nom, email, motDePasse, contact } = req.body;

  if (!nom || !email || !motDePasse || !contact) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  try {
    if (isMysql()) {
      const emailExists = await mysqlUserRepository.findUserByEmail(email);
      if (emailExists) return res.status(409).json({ message: 'Email déjà utilisé.' });

      const contactExists = await mysqlUserRepository.findUserByContact(contact);
      if (contactExists) return res.status(409).json({ message: 'Contact déjà utilisé.' });

      const hashedPassword = await bcrypt.hash(motDePasse, 12);
      const user = await mysqlUserRepository.createUser({
        nom, email, motDePasse: hashedPassword, contact,
        role: 'consommateur', isVerified: false,
      });

      const otp = generateOtp();
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await mysqlUserRepository.updateUserOtp(user.id, otp, otpExpire);
      await sendOtpWhatsApp(contact, otp);

      return res.status(201).json({
        success: true,
        pendingVerification: true,
        message: 'Inscription réussie ! Vérifiez votre WhatsApp pour le code OTP.',
        telephone: contact,
      });
    }

    return res.status(400).json({ message: 'Fonctionnalité non disponible.' });
  } catch (err) {
    console.error('[Inscription consommateur]', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Message de bienvenue WhatsApp pour les visiteurs sans compte
router.post('/welcome-visitor', async (req, res) => {
  const { phone, email } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Numéro WhatsApp requis' });
  }

  const message =
    `🌿 *Bienvenue chez VivriMarket !* Merci de votre visite !\n\n` +
    `Bonjour à vous ! C'est un plaisir de vous compter parmi nos visiteurs.\n\n` +
    `Merci de l'intérêt que vous portez à *VivriMarket*.\n` +
    `Vous faites désormais partie de notre communauté.\n\n` +
    `Vous recevrez bientôt des nouvelles exclusives de notre part.\n` +
    `En attendant, n'hésitez pas à visiter notre site pour découvrir nos derniers articles.\n\n` +
    `Cordialement,\n*L'équipe VivriMarket* 🌾`;

  try {
    const result = await sendWhatsApp(phone, message);
    console.log(`[Welcome] ${phone} (${email || 'sans email'}) — envoi: ${result.simulated ? 'simulé' : result.success ? 'OK' : 'échec'}`);
    return res.json({ success: true, simulated: result.simulated || false });
  } catch (err) {
    console.error('[Welcome WA]', err.message);
    return res.json({ success: false, error: err.message });
  }
});

router.get('/', (req, res) => {
  res.json({ status: 'active', message: 'API Auth operationnelle', timestamp: new Date().toISOString() });
});

module.exports = router;
