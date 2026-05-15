const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, param, query } = require('express-validator');
const handleValidationErrors = require('../middlewares/validationMiddleware');

// 🔐 Middleware global de protection et d'authorisation
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize('admin'));

// Rate limiting global sur toutes les routes admin
router.use(rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 120,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({ message: 'Trop de requêtes. Réessayez dans une minute.' });
  },
}));

// ✅ Validation commune
const validateId = [
  param('id')
    .notEmpty().withMessage('ID requis')
    .isUUID().withMessage('ID utilisateur invalide')
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
    .isInt({ min: 1, max: 1000 }).withMessage('La limite doit être entre 1 et 1000')
    .toInt(),
  handleValidationErrors
];

const validateRoleUpdate = [
  body('role')
    .isIn(['agriculteur', 'consommateur', 'admin'])
    .withMessage('Rôle invalide. Valeurs acceptées: agriculteur, consommateur, admin'),
  handleValidationErrors
];

const validateCreateUser = [
  body('nom').trim().notEmpty().withMessage('Nom requis').isLength({ min: 2, max: 50 }),
  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('contact').trim().notEmpty().withMessage('Contact requis'),
  body('motDePasse').isLength({ min: 6 }).withMessage('Mot de passe : 6 caractères minimum'),
  body('role').isIn(['agriculteur', 'consommateur', 'admin']).withMessage('Rôle invalide'),
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

// 🖥️ Statut système
router.get('/system-status', adminController.getSystemStatus);

// 📧 Test notification
router.post('/test-notification', adminController.sendTestNotification);

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

router.post('/users', validateCreateUser, adminController.createAdminUser);

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

router.put('/users/:id/suspend',
  validateId,
  body('suspended').isBoolean().withMessage('suspended doit être un booléen'),
  handleValidationErrors,
  adminController.suspendUser
);

router.get('/users/:id/activity',
  validateId,
  adminController.getUserActivity
);

// 🧹 Nettoyage des champs obsolètes (fonction non implémentée)
// router.post('/users/cleanup-obsolete-fields', 
//   adminController.cleanupObsoleteFields
// );

// 💰 Gestion des transactions
router.get('/transactions/stats', adminController.getTransactionStats);

router.get('/transactions',
  validatePagination,
  [
    query('status')
      .optional()
      .isIn(['success', 'completed', 'pending', 'failed', 'refunded'])
      .withMessage('Statut invalide. Valeurs acceptées: success, pending, failed, refunded'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('La recherche ne peut dépasser 100 caractères'),
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
      .isIn(['active', 'expired', 'pending', 'cancelled', 'expiring_soon'])
      .withMessage('Statut invalide. Valeurs acceptées: active, expired, pending, cancelled, expiring_soon'),
    query('formule')
      .optional()
      .isIn(['BLEU', 'GOLD', 'PLATINUM'])
      .withMessage('Formule invalide. Valeurs acceptées: BLEU, GOLD, PLATINUM'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('La recherche ne peut dépasser 100 caractères'),
    handleValidationErrors
  ],
  adminController.getSubscriptions
);

// 📋 Audit logs
router.get('/audit-logs', validatePagination, adminController.getAuditLogs);

// ── Paramètres paiement multi-providers ──────────────────────────────────────
const appSettings     = require('../repositories/mysqlAppSettingsRepository');
const providerRepo    = require('../repositories/mysqlPaymentProviderRepository');
const paymentService  = require('../utils/paymentService');

// GET /api/v1/admin/payment-providers
router.get('/payment-providers', async (req, res) => {
  try {
    const providers = await providerRepo.findAll();
    // Mask config — never expose credentials
    return res.json({ success: true, providers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/v1/admin/payment-providers/:id/config — config fields masqués
router.get('/payment-providers/:id/config', async (req, res) => {
  try {
    const provider = await providerRepo.findById(req.params.id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider introuvable' });
    // Return masked config (keys present but values hidden)
    const masked = {};
    for (const [k, v] of Object.entries(provider.config || {})) {
      masked[k] = v ? (k.includes('key') || k.includes('secret') || k.includes('password') || k.includes('token')
        ? '••••••••'
        : v) : '';
    }
    return res.json({ success: true, config: masked, enabled: !!provider.enabled });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/v1/admin/payment-providers/:id
router.put('/payment-providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, config } = req.body;

    const existing = await providerRepo.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Provider introuvable' });

    // Merge config: only update fields that are not empty/masked
    const currentConfig = existing.config || {};
    const newConfig = { ...currentConfig };
    if (config && typeof config === 'object') {
      for (const [k, v] of Object.entries(config)) {
        if (v && v !== '••••••••') newConfig[k] = v; // skip masked values
      }
    }

    await providerRepo.updateConfig(id, { enabled, config: newConfig });
    paymentService.invalidateCaches(id);

    return res.json({ success: true, message: `Provider "${id}" mis à jour.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/v1/admin/payment-providers/:id/test
router.post('/payment-providers/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { config: overrideConfig } = req.body;

    // If override config provided, merge with stored (for testing before saving)
    let testConfig = overrideConfig;
    if (!testConfig) {
      const provider = await providerRepo.findById(id);
      testConfig = provider?.config;
    } else {
      // Merge with stored to fill in masked fields
      const provider = await providerRepo.findById(id);
      const stored = provider?.config || {};
      testConfig = { ...stored };
      for (const [k, v] of Object.entries(overrideConfig)) {
        if (v && v !== '••••••••') testConfig[k] = v;
      }
    }

    const result = await paymentService.testProvider(id, testConfig);
    return res.json({ success: result.ok, connected: result.ok, message: result.message });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/admin/general-settings (keep existing)
router.get('/general-settings', async (req, res) => {
  try {
    const db = await appSettings.getMany(['admin_email', 'platform_name']);
    return res.json({
      success: true,
      data: {
        adminEmail:    db.admin_email    || '',
        platformName:  db.platform_name  || 'VivriMarket',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/v1/admin/general-settings (keep existing)
router.put('/general-settings', async (req, res) => {
  try {
    const { adminEmail, platformName } = req.body;
    if (adminEmail !== undefined)    await appSettings.set('admin_email',    adminEmail.trim());
    if (platformName !== undefined)  await appSettings.set('platform_name',  platformName.trim());
    return res.json({ success: true, message: 'Paramètres généraux mis à jour.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;