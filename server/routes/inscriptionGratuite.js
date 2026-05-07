const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const mysqlAbonnementRepository = require('../repositories/mysqlAbonnementRepository');
const { isMysql } = require('../utils/authHelpers');

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

      const token = jwt.sign(
        { id: user.id, role: 'agriculteur', email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '1h' }
      );

      return res.status(201).json({
        success: true,
        message: "Inscription gratuite réussie !",
        data: {
          id: user.id,
          nom: user.nom,
          email: user.email,
        },
        token,
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