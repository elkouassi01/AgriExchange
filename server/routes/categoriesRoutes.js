const express = require('express');
const router = express.Router();
const categoryRepo = require('../repositories/mysqlCategoryRepository');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, param } = require('express-validator');
const handleValidationErrors = require('../middlewares/validationMiddleware');

// ── Validation helpers ────────────────────────────────────────────────────────

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID invalide').toInt(),
  handleValidationErrors,
];

const validateBody = [
  body('nom').trim().notEmpty().withMessage('Le nom est requis'),
  body('slug')
    .trim()
    .notEmpty().withMessage('Le slug est requis')
    .matches(/^[a-z0-9\-éàèùâêîôûäëïöü]+$/i).withMessage('Slug invalide'),
  body('categorieValue').optional({ nullable: true }).trim(),
  body('parentId').optional({ nullable: true }).toInt(),
  body('ordre').optional().isInt({ min: 0 }).toInt(),
  body('actif').optional().isBoolean().toBoolean(),
  handleValidationErrors,
];

// ── Routes publiques ──────────────────────────────────────────────────────────

// GET /api/v1/categories → arbre complet (utilisé par ProductsPage)
router.get('/', async (req, res) => {
  try {
    const tree = await categoryRepo.findTree();
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Routes Admin (protect + admin role) ──────────────────────────────────────

const adminOnly = [authMiddleware.protect, authMiddleware.authorize('admin')];

// POST /api/v1/categories → créer une catégorie
router.post('/', adminOnly, validateBody, async (req, res) => {
  try {
    const id = await categoryRepo.create(req.body);
    res.status(201).json({ success: true, id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Ce slug est déjà utilisé.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/categories/:id → modifier une catégorie
router.put('/:id', adminOnly, validateId, validateBody, async (req, res) => {
  try {
    const ok = await categoryRepo.update(req.params.id, req.body);
    if (!ok) return res.status(404).json({ success: false, message: 'Catégorie introuvable.' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Ce slug est déjà utilisé.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/categories/:id → supprimer une catégorie
router.delete('/:id', adminOnly, validateId, async (req, res) => {
  try {
    const ok = await categoryRepo.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Catégorie introuvable.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
