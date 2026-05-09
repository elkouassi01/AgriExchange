const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const repo = require('../repositories/mysqlReviewRepository');

// GET /api/v1/reviews/seller/:sellerId — public
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const data = await repo.getReviewsForSeller(req.params.sellerId);
    return res.json(data);
  } catch (err) {
    console.error('[reviews GET]', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/v1/reviews/seller/:sellerId — consommateur uniquement
router.post('/seller/:sellerId', protect, async (req, res) => {
  if (req.user.role !== 'consommateur') {
    return res.status(403).json({ message: 'Seuls les acheteurs peuvent laisser un avis.' });
  }

  const reviewerId = req.user.id || req.user._id;
  const sellerId   = req.params.sellerId;

  if (reviewerId === sellerId) {
    return res.status(400).json({ message: 'Vous ne pouvez pas vous évaluer vous-même.' });
  }

  const rating = parseInt(req.body.rating, 10);
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Note invalide (1 à 5 étoiles).' });
  }

  const comment = (req.body.comment || '').trim().slice(0, 1000);

  try {
    const review = await repo.upsertReview(sellerId, reviewerId, rating, comment);
    return res.status(201).json({ success: true, review });
  } catch (err) {
    console.error('[reviews POST]', err);
    return res.status(500).json({ message: 'Erreur lors de la publication.' });
  }
});

// DELETE /api/v1/reviews/:reviewId — auteur ou admin
router.delete('/:reviewId', protect, async (req, res) => {
  const reviewerId = req.user.id || req.user._id;
  const isAdmin    = req.user.role === 'admin';
  try {
    const deleted = await repo.deleteReview(req.params.reviewId, reviewerId, isAdmin);
    if (!deleted) return res.status(404).json({ message: 'Avis introuvable ou non autorisé.' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[reviews DELETE]', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
