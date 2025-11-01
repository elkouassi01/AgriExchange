const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Route dédiée pour l’inscription gratuite (promo agriculteurs)
router.post('/inscription-gratuite', async (req, res) => {
  try {
    const { nom, email, motDePasse, contact, fermeNom, localisation, typeExploitation } = req.body;

    // Vérifie si l'utilisateur existe déjà
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(409).json({ message: "Email déjà utilisé." });
    }

    // Stokage du mot de passe
    const motDePasseClair = motDePasse;

    // Configuration abonnement gratuit (6 mois)
    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 6);

    const nouvelUtilisateur = new User({
      nom,
      email,
      motDePasse: motDePasseClair,
      contact,
      role: 'agriculteur',
      fermeNom,
      localisation,
      typeExploitation,
      abonnement: {
        formule: 'BLEU',
        dateDebut,
        dateFin,
        montant: 0,
        statut: 'actif',
        promo: true,
      },
      status: 'active'
    });

    await nouvelUtilisateur.save();

    // Création d’un token JWT
    const token = jwt.sign(
      { id: nouvelUtilisateur._id, role: 'agriculteur', email: nouvelUtilisateur.email },
      process.env.JWT_SECRET,
      { expiresIn: '6m' } // token valable 6 mois
    );

    return res.status(201).json({
      success: true,
      message: "Inscription gratuite réussie !",
      data: {
        id: nouvelUtilisateur._id,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email,
        abonnement: nouvelUtilisateur.abonnement
      },
      token
    });
  } catch (err) {
    console.error("Erreur inscription gratuite:", err);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

module.exports = router;
