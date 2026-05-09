const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const { isMysql } = require('../utils/authHelpers');
const { sendWhatsApp } = require('../utils/whatsappClient');
const { protect } = require('../middlewares/auth');

const VALID_FORMULES = ['BLEU', 'GOLD', 'PLATINUM'];

const FORMULE_DURATIONS_MONTHS = { BLEU: 1, GOLD: 3, PLATINUM: 6 };

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtpWhatsApp = async (phone, otp) => {
  const msg =
    `🔐 *VivriMarket* — Code de vérification\n\n` +
    `Votre code OTP est : *${otp}*\n\n` +
    `Ce code expire dans *10 minutes*.\n` +
    `Ne le partagez avec personne.`;
  await sendWhatsApp(phone, msg).catch((e) => console.error('[OTP WA]', e.message));
};

// POST /api/v1/inscription-gratuite
router.post('/', async (req, res) => {
  try {
    const {
      nom, email, motDePasse, contact,
      fermeNom, localisation, typeExploitation,
      surface, description,
      formule: rawFormule,
    } = req.body;

    const formule = VALID_FORMULES.includes(rawFormule) ? rawFormule : 'BLEU';
    const durationMonths = FORMULE_DURATIONS_MONTHS[formule];

    if (isMysql()) {
      const emailExists = await mysqlUserRepository.findUserByEmail(email);
      if (emailExists) {
        return res.status(409).json({ message: 'Email déjà utilisé.' });
      }

      const contactExists = await mysqlUserRepository.findUserByContact(contact);
      if (contactExists) {
        return res.status(409).json({ message: 'Contact déjà utilisé.' });
      }

      const hashedPassword = await bcrypt.hash(motDePasse, 12);

      const user = await mysqlUserRepository.createUser({
        nom,
        email,
        motDePasse: hashedPassword,
        contact,
        role: 'agriculteur',
        fermeNom,
        localisation,
        typeExploitation,
        surface: surface || null,
        description: description || null,
        isVerified: false,
      });

      const dateDebut = new Date();
      const dateFin = new Date();
      dateFin.setMonth(dateFin.getMonth() + durationMonths);

      await mysqlUserRepository.updateUserSubscription(user.id, {
        formule,
        dateDebut,
        dateFin,
        montant: 0,
        statut: 'actif',
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

    // MongoDB path
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(409).json({ message: 'Email déjà utilisé.' });
    }

    const contactExists = await User.findOne({ contact });
    if (contactExists) {
      return res.status(409).json({ message: 'Contact déjà utilisé.' });
    }

    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + durationMonths);

    const nouvelUtilisateur = new User({
      nom,
      email,
      motDePasse,
      contact,
      role: 'agriculteur',
      fermeNom,
      localisation,
      typeExploitation,
      description: description || '',
      status: 'active',
    });

    await nouvelUtilisateur.save();

    const token = jwt.sign(
      { id: nouvelUtilisateur._id, role: 'agriculteur', email: nouvelUtilisateur.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '1h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Inscription gratuite réussie !',
      data: {
        id: nouvelUtilisateur._id,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email,
      },
      token,
    });
  } catch (err) {
    console.error('Erreur inscription gratuite:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// GET /api/v1/inscription-gratuite/mon-abonnement
router.get('/mon-abonnement', protect, async (req, res) => {
  if (req.user.role !== 'agriculteur') {
    return res.status(403).json({ message: 'Réservé aux agriculteurs' });
  }

  try {
    const userId = req.user.id || req.user._id;
    const abonnement = await mysqlUserRepository.getActiveSubscriptionForUser(userId);

    if (!abonnement) {
      return res.json({ abonnement: null });
    }

    const dateFin = abonnement.dateFin ? new Date(abonnement.dateFin) : null;
    const joursRestants = dateFin
      ? Math.max(0, Math.ceil((dateFin - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    return res.json({
      abonnement: {
        formule: abonnement.formule,
        statut: abonnement.statut,
        dateDebut: abonnement.dateDebut,
        dateFin: abonnement.dateFin,
        joursRestants,
      },
    });
  } catch (err) {
    console.error('[mon-abonnement]', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/v1/inscription-gratuite/renouveler
router.post('/renouveler', protect, async (req, res) => {
  if (req.user.role !== 'agriculteur') {
    return res.status(403).json({ message: 'Réservé aux agriculteurs' });
  }

  const { formule: rawFormule } = req.body;

  try {
    const userId = req.user.id || req.user._id;

    const currentSub = await mysqlUserRepository.getActiveSubscriptionForUser(userId);

    const FORMULE_RANK = { BLEU: 1, GOLD: 2, PLATINUM: 3 };
    const currentRank = FORMULE_RANK[currentSub?.formule] || 0;
    const formule = VALID_FORMULES.includes(rawFormule)
      ? rawFormule
      : (currentSub?.formule || 'BLEU');
    const requestedRank = FORMULE_RANK[formule] || 0;
    const isUpgrade = requestedRank > currentRank;

    // Bloquer le renouvellement si l'abonnement est encore bien actif (> 30 j)
    // sauf si c'est un upgrade vers une formule supérieure
    if (currentSub?.dateFin && !isUpgrade) {
      const joursRestantsActuel = Math.ceil(
        (new Date(currentSub.dateFin) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (joursRestantsActuel > 30) {
        return res.status(403).json({
          message: `Renouvellement impossible : votre abonnement est actif encore ${joursRestantsActuel} jours. Vous pouvez upgrader vers une formule supérieure.`,
        });
      }
    }

    const durationMonths = FORMULE_DURATIONS_MONTHS[formule];

    // Upgrade → repart d'aujourd'hui ; renouvellement → prolonge depuis dateFin
    const now = new Date();
    const currentFin = currentSub?.dateFin ? new Date(currentSub.dateFin) : null;
    const baseDate = isUpgrade ? now : (currentFin && currentFin > now ? currentFin : now);
    const dateFin = new Date(baseDate);
    dateFin.setMonth(dateFin.getMonth() + durationMonths);

    await mysqlUserRepository.updateUserSubscription(userId, {
      formule,
      dateDebut: now,
      dateFin,
      montant: 0,
      statut: 'actif',
    });

    const joursRestants = Math.ceil((dateFin - now) / (1000 * 60 * 60 * 24));

    console.log(`[Renouvellement] Agriculteur ${userId} → ${formule} jusqu'au ${dateFin.toLocaleDateString('fr-FR')}`);

    return res.json({
      success: true,
      message: `Abonnement ${formule} renouvelé avec succès !`,
      abonnement: {
        formule,
        statut: 'actif',
        dateDebut: now,
        dateFin,
        joursRestants,
      },
    });
  } catch (err) {
    console.error('[renouveler]', err);
    return res.status(500).json({ message: 'Erreur lors du renouvellement' });
  }
});

module.exports = router;
