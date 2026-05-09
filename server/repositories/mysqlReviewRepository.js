const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const mapRow = (row) => ({
  id: row.id,
  sellerId: row.seller_id,
  reviewerId: row.reviewer_id,
  reviewerNom: row.reviewer_nom,
  reviewerPhoto: row.reviewer_photo || null,
  rating: row.rating,
  comment: row.comment || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Avis d'un vendeur (liste + résumé)
const getReviewsForSeller = async (sellerId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT r.*, u.nom AS reviewer_nom, u.photo AS reviewer_photo
     FROM seller_reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.seller_id = ?
     ORDER BY r.created_at DESC`,
    [sellerId]
  );
  const reviews = rows.map(mapRow);
  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;
  return { reviews, avgRating: avg, count: reviews.length };
};

// Avis d'un reviewer pour un vendeur précis
const getReviewByReviewer = async (sellerId, reviewerId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT r.*, u.nom AS reviewer_nom, u.photo AS reviewer_photo
     FROM seller_reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.seller_id = ? AND r.reviewer_id = ? LIMIT 1`,
    [sellerId, reviewerId]
  );
  return rows[0] ? mapRow(rows[0]) : null;
};

// Créer ou mettre à jour (UPSERT)
const upsertReview = async (sellerId, reviewerId, rating, comment) => {
  const pool = getMysqlPool();
  const existing = await getReviewByReviewer(sellerId, reviewerId);
  if (existing) {
    await pool.query(
      'UPDATE seller_reviews SET rating = ?, comment = ?, updated_at = NOW() WHERE id = ?',
      [rating, comment || '', existing.id]
    );
    return getReviewByReviewer(sellerId, reviewerId);
  }
  const id = randomUUID();
  await pool.query(
    'INSERT INTO seller_reviews (id, seller_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
    [id, sellerId, reviewerId, rating, comment || '']
  );
  return getReviewByReviewer(sellerId, reviewerId);
};

// Supprimer (reviewer ou admin)
const deleteReview = async (reviewId, reviewerId, isAdmin = false) => {
  const pool = getMysqlPool();
  const query = isAdmin
    ? 'DELETE FROM seller_reviews WHERE id = ?'
    : 'DELETE FROM seller_reviews WHERE id = ? AND reviewer_id = ?';
  const params = isAdmin ? [reviewId] : [reviewId, reviewerId];
  const [result] = await pool.query(query, params);
  return result.affectedRows > 0;
};

module.exports = { getReviewsForSeller, getReviewByReviewer, upsertReview, deleteReview };
