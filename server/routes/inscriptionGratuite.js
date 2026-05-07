const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const mysqlAbonnementRepository = require('../repositories/mysqlAbonnementRepository');
const { isMysql } = require('../utils/authHelpers');
const { sendWhatsApp } = require('../utils/whatsappClient');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtpWhatsApp = async (phone, otp) => {
  const msg =
    `🔐 *VivriMarket* — Code de vérification\n\n` +
    `Votre code OTP est : *${otp}*\n\n` +
    `Ce code expire dans *10 minutes*.\n` +
    `Ne le partagez avec personne.`;
  await sendWhatsApp(phone, msg).catch((e) => console.error('[OTP WA]', e.message));
};

router.post('/inscription-gratuite', async (req, res) => {
  try {
    const { nom, email, motDePasse, contact, fermeNom, localisation, typeExploitation } = req.body;

    if (isMysql()) {
      const emailExists = await mysqlUserRepository.findUserByEmail(email);
      if (emailExists) {
        return res.status(409).json({ message: "Email déjà utilisé." });
      }

      const contactExists = await mysqlUserRepository.findUserByContact(contact);
      if (contactExists) {
        return res.status(409).json({ message: "Contact déjà utilisé." });
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
        isVerified: false,
      });

      const dateDebut = new Date();
      const dateFin = new Date();
      dateFin.setMonth(dateFin.getMonth() + 6);

      await mysqlUserRepository.updateUserSubscription(user.id, {
        formule: 'BLEU',
        dateDebut,
        dateFin,
        montant: 0,
        statut: 'actif',
      });

      // Génère et envoie l'OTP WhatsApp
      const otp = generateOtp();
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await mysqlUserRepository.updateUserOtp(user.id, otp, otpExpire);
      await sendOtpWhatsApp(contact, otp);

      return res.status(201).json({
        success: true,
        pendingVerification: true,
        message: "Inscription réussie ! Vérifiez votre WhatsApp pour le code OTP.",
        telephone: contact,
      });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(409).json({ message: "Email déjà utilisé." });
    }

    const contactExists = await User.findOne({ contact });
    if (contactExists) {
      return res.status(409).json({ message: "Contact déjà utilisé." });
    }

    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 6);

    const nouvelUtilisateur = new User({
      nom,
      email,
      motDePasse,
      contact,
      role: 'agriculteur',
      fermeNom,
      localisation,
      typeExploitation,
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
      message: "Inscription gratuite réussie !",
      data: {
        id: nouvelUtilisateur._id,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email,
      },
      token,
    });
  } catch (err) {
    console.error("Erreur inscription gratuite:", err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

module.exports = router;