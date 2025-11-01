const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getFarmerDashboard, getFarmerProducts } = require('../controllers/farmerController');

// 🔐 Tableau de bord
router.get('/:id/dashboard', protect, authorize('agriculteur'), getFarmerDashboard);

// 🔎 Liste des produits postés par un agriculteur
router.get('/:id/produits', protect, authorize('agriculteur'), getFarmerProducts);

module.exports = router;
