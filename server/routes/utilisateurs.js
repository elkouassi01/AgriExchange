const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const handleValidationErrors = require('../middlewares/validationMiddleware');

// Validation des données d'inscription
const validateRegistration = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom est obligatoire')
    .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est obligatoire')
    .isEmail().withMessage('Format email invalide')
    .normalizeEmail(),
  
  body('motDePasse')
    .trim()
    .notEmpty().withMessage('Le mot de passe est obligatoire')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre'),
  
  body('contact')
    .trim()
    .notEmpty().withMessage('Le contact est obligatoire')
    .isMobilePhone('any').withMessage('Numéro de contact invalide'),
  
  body('role')
    .isIn(['agriculteur', 'consommateur', 'admin'])
    .withMessage('Rôle utilisateur invalide'),
  
  body('formule')
    .optional()
    .isIn(['BLEU', 'GOLD', 'PLATINUM'])
    .withMessage('Formule d\'abonnement invalide'),
  
  body('fermeNom')
    .if(body('role').equals('agriculteur'))
    .notEmpty().withMessage('Le nom de la ferme est obligatoire pour les agriculteurs')
    .trim(),
  
  handleValidationErrors
];

router.post('/inscription', validateRegistration, async (req, res) => {
  try {
    const {
      nom,
      email,
      motDePasse,
      contact,
      role,
      formule,
      fermeNom,
      localisation,
      typeExploitation
    } = req.body;

    // Vérifier unicité email et contact
    const [existeEmail, existeContact] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ contact })
    ]);

    if (existeEmail) {
      return res.status(409).json({ 
        code: 'EMAIL_EXISTS',
        message: "Email déjà utilisé." 
      });
    }

    if (existeContact) {
      return res.status(409).json({ 
        code: 'CONTACT_EXISTS',
        message: "Numéro de contact déjà utilisé." 
      });
    }

    // Configuration abonnement
    let abonnement = null;
    if (formule) {
      const dateDebut = new Date();
      const dateFin = new Date(dateDebut);
      let montant = 0;

      switch (formule) {
        case 'BLEU':
          dateFin.setMonth(dateFin.getMonth() + 1);
          montant = role === 'agriculteur' ? 1500 : 1000;
          break;
        case 'GOLD':
          dateFin.setMonth(dateFin.getMonth() + 3);
          montant = role === 'agriculteur' ? 4000 : 3000;
          break;
        case 'PLATINUM':
          dateFin.setMonth(dateFin.getMonth() + 6);
          montant = role === 'agriculteur' ? 8000 : 5000;
          break;
      }

      abonnement = {
        formule,
        dateDebut,
        dateFin,
        montant,
        statut: 'en_attente'
      };
    }

    // Création de l'utilisateur
    const nouvelUtilisateur = new User({
      nom,
      email,
      motDePasse, // Le hashage est géré dans le modèle via le pre-save hook
      contact,
      role,
      fermeNom: role === 'agriculteur' ? fermeNom : undefined,
      localisation: role === 'agriculteur' ? localisation : undefined,
      typeExploitation: role === 'agriculteur' ? typeExploitation : undefined,
      abonnement,
      status: 'active'
    });

    await nouvelUtilisateur.save();

    // Création du token JWT
    const payload = {
      id: nouvelUtilisateur._id,
      role: nouvelUtilisateur.role,
      email: nouvelUtilisateur.email
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRE || '1d', 
        issuer: process.env.JWT_ISSUER || 'agriexchange' 
      }
    );

    // Configuration du cookie HTTP-only
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: parseInt(process.env.JWT_COOKIE_EXPIRE) || 24 * 60 * 60 * 1000
    };

    res.cookie('token', token, cookieOptions);

    // Réponse sans données sensibles
    return res.status(201).json({
      success: true,
      message: "Compte créé avec succès.",
      data: {
        id: nouvelUtilisateur._id,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email,
        role: nouvelUtilisateur.role,
        abonnement: nouvelUtilisateur.abonnement
      }
    });

  } catch (err) {
    console.error("Erreur inscription:", err);

    // Gestion spécifique des erreurs MongoDB
    if (err.name === 'MongoServerError' && err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        code: 'DUPLICATE_KEY',
        message: `La valeur ${err.keyValue[field]} existe déjà pour le champ ${field}`
      });
    }

    // Erreurs de validation Mongoose
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      
      return res.status(400).json({ 
        code: 'VALIDATION_ERROR',
        message: "Erreur de validation des données",
        errors 
      });
    }

    // Erreur générique
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: "Erreur lors de la création du compte",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;