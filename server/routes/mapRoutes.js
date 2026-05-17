const express = require('express');
const router = express.Router();
const { getMysqlPool } = require('../config/mysql');
const { protect } = require('../middlewares/auth');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');

// Formule de Haversine — distance en km entre deux points GPS
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// GET /api/v1/map/farmers
// Retourne tous les agriculteurs géolocalisés avec leurs produits (sans contact)
router.get('/farmers', async (req, res) => {
  try {
    const pool = getMysqlPool();
    const userLat = req.query.lat ? parseFloat(req.query.lat) : null;
    const userLon = req.query.lng ? parseFloat(req.query.lng) : null;
    const maxKm   = req.query.radius ? parseFloat(req.query.radius) : null;

    const [rows] = await pool.query(`
      SELECT
        u.id, u.nom, u.ferme_nom, u.localisation,
        u.latitude, u.longitude, u.photo, u.type_exploitation,
        COUNT(DISTINCT p.id) AS nb_produits,
        GROUP_CONCAT(DISTINCT p.categorie ORDER BY p.categorie SEPARATOR ',') AS categories
      FROM users u
      LEFT JOIN products p
        ON p.seller_id = u.id
        AND p.moderation_status = 'approved'
        AND p.stock > 0
      WHERE u.role = 'agriculteur'
        AND u.est_actif = 1
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
      GROUP BY u.id
    `);

    let farmers = rows.map((r) => {
      const lat = parseFloat(r.latitude);
      const lon = parseFloat(r.longitude);
      const distance = userLat !== null && userLon !== null
        ? Math.round(haversine(userLat, userLon, lat, lon) * 10) / 10
        : null;

      return {
        id: r.id,
        nom: r.nom,
        fermeNom: r.ferme_nom || r.nom,
        localisation: r.localisation || '',
        latitude: lat,
        longitude: lon,
        photo: r.photo || null,
        typeExploitation: r.type_exploitation || '',
        nbProduits: parseInt(r.nb_produits, 10),
        categories: r.categories ? r.categories.split(',') : [],
        distance,
      };
    });

    // Filtrer par rayon si demandé
    if (maxKm !== null && userLat !== null) {
      farmers = farmers.filter((f) => f.distance !== null && f.distance <= maxKm);
    }

    // Trier par distance si position fournie, sinon par nb_produits
    if (userLat !== null) {
      farmers.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    } else {
      farmers.sort((a, b) => b.nbProduits - a.nbProduits);
    }

    return res.json({ success: true, farmers });
  } catch (err) {
    console.error('[map/farmers]', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/v1/map/location — Agriculteur enregistre sa position
router.put('/location', protect, async (req, res) => {
  if (req.user.role !== 'agriculteur') {
    return res.status(403).json({ message: 'Réservé aux agriculteurs' });
  }

  const { latitude, longitude } = req.body;
  if (
    latitude == null || longitude == null ||
    isNaN(latitude) || isNaN(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return res.status(400).json({ message: 'Coordonnées invalides' });
  }

  try {
    await mysqlUserRepository.updateUserLocation(req.user.id, latitude, longitude);
    return res.json({ success: true, message: 'Position enregistrée.' });
  } catch (err) {
    console.error('[map/location]', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
