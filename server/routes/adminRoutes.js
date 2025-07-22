const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, param, query } = require('express-validator');
const handleValidationErrors = require('../middlewares/validationMiddleware');

// 🔐 Middleware global de protection et d'authorisation
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize('admin'));

// ✅ Validation commune
const validateId = [
  param('id')
    .isMongoId().withMessage('ID utilisateur invalide')
    .bail()
    .customSanitizer(value => value.trim()),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La page doit être un entier positif ≥ 1')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100')
    .toInt(),
  handleValidationErrors
];

const validateRoleUpdate = [
  body('role')
    .isIn(['agriculteur', 'consommateur', 'admin'])
    .withMessage('Rôle invalide. Valeurs acceptées: agriculteur, consommateur, admin'),
  handleValidationErrors
];

// 🔄 Validation pour les updates utilisateur
const validateUserUpdate = [
  body('nom')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email')
    .optional()
    .isEmail().withMessage('Format email invalide')
    .normalizeEmail(),
  body('telephone')
    .optional()
    .isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  body('adresse')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('L\'adresse ne peut dépasser 255 caractères'),
  handleValidationErrors
];

// 📊 Dashboard Admin
router.get('/dashboard', adminController.getDashboardStats);

// 👥 Gestion des utilisateurs
router.get('/users', 
  validatePagination,
  [
    query('role')
      .optional()
      .isIn(['agriculteur', 'consommateur', 'admin'])
      .withMessage('Rôle invalide'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('La recherche ne peut dépasser 50 caractères'),
    handleValidationErrors
  ],
  adminController.getUsers
);

router.get('/users/:id', 
  validateId,
  adminController.getUserById
);

router.put('/users/:id', 
  validateId,
  validateUserUpdate,
  adminController.updateUser
);

router.put('/users/:id/role',
  validateId,
  validateRoleUpdate,
  adminController.updateUserRole
);

router.delete('/users/:id', 
  validateId,
  adminController.deleteUser
);

router.get('/users/:id/activity',
  validateId,
  adminController.getUserActivity
);

// 🧹 Nettoyage des champs obsolètes
router.post('/users/cleanup-obsolete-fields', 
  adminController.cleanupObsoleteFields  // <-- Correction essentielle
);

// 💰 Gestion des transactions
router.get('/transactions', 
  validatePagination,
  [
    query('status')
      .optional()
      .isIn(['success', 'pending', 'failed'])
      .withMessage('Statut invalide. Valeurs acceptées: success, pending, failed'),
    handleValidationErrors
  ],
  adminController.getTransactions
);

// 📦 Gestion des abonnements
router.get('/abonnements', 
  validatePagination,
  [
    query('status')
      .optional()
      .isIn(['active', 'expired', 'pending'])
      .withMessage('Statut invalide. Valeurs acceptées: active, expired, pending'),
    handleValidationErrors
  ],
  adminController.getSubscriptions
);

module.exports = router;