const express = require('express');
const router = express.Router();
const { getMysqlPool } = require('../config/mysql');
const { protect, authorize } = require('../middlewares/auth');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const notificationService = require('../utils/notificationService');
const auditLog = require('../repositories/mysqlAuditLogRepository');

// GET /api/v1/moderation/pending — liste des produits en attente
router.get('/pending', protect, authorize(['admin']), async (req, res) => {
  try {
    const pool = getMysqlPool();
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM products WHERE moderation_status = 'pending'"
    );

    const [rows] = await pool.query(
      `SELECT p.id, p.nom, p.prix, p.categorie, p.stock, p.unite, p.image_url,
              p.description, p.etat, p.created_at, p.moderation_status,
              u.id AS seller_id, u.nom AS seller_nom, u.email AS seller_email, u.contact AS seller_contact
       FROM products p
       JOIN users u ON u.id = p.seller_id
       WHERE p.moderation_status = 'pending'
       ORDER BY p.created_at ASC
       LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), offset]
    );

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      products: rows.map((r) => ({
        id: r.id,
        nom: r.nom,
        prix: Number(r.prix),
        categorie: r.categorie,
        stock: r.stock,
        unite: r.unite,
        imageUrl: r.image_url,
        description: r.description,
        etat: r.etat,
        createdAt: r.created_at,
        moderationStatus: r.moderation_status,
        seller: {
          id: r.seller_id,
          nom: r.seller_nom,
          email: r.seller_email,
          contact: r.seller_contact,
        },
      })),
    });
  } catch (err) {
    console.error('[moderation/pending]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/v1/moderation/all — tous les produits (filtrable par statut)
router.get('/all', protect, authorize(['admin']), async (req, res) => {
  try {
    const pool = getMysqlPool();
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);

    const statusFilter = ['pending', 'approved', 'rejected'].includes(status) ? status : null;
    const whereClause = statusFilter ? `WHERE p.moderation_status = '${statusFilter}'` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM products p ${whereClause}`
    );

    const [rows] = await pool.query(
      `SELECT p.id, p.nom, p.prix, p.categorie, p.stock, p.image_url,
              p.moderation_status, p.moderation_note, p.moderated_at, p.created_at,
              u.nom AS seller_nom, u.contact AS seller_contact,
              m.nom AS moderated_by_nom
       FROM products p
       JOIN users u ON u.id = p.seller_id
       LEFT JOIN users m ON m.id = p.moderated_by
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), offset]
    );

    return res.json({ success: true, total, page: parseInt(page, 10), products: rows });
  } catch (err) {
    console.error('[moderation/all]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/v1/moderation/:id/approve
router.put('/:id/approve', protect, authorize(['admin']), async (req, res) => {
  try {
    const pool = getMysqlPool();
    const adminId = req.user.id || req.user._id;
    const { id } = req.params;

    const [[product]] = await pool.query(
      'SELECT p.*, u.nom AS seller_nom, u.contact AS seller_contact FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = ?',
      [id]
    );
    if (!product) return res.status(404).json({ success: false, message: 'Denrée introuvable' });

    await pool.query(
      `UPDATE products SET moderation_status = 'approved', moderation_note = NULL,
       moderated_by = ?, moderated_at = NOW() WHERE id = ?`,
      [adminId, id]
    );

     // Notifier l'agriculteur (WhatsApp + Email + message in-app)
     const msg =
       `✅ *VivriMarket — Denrée approuvée !*\n\n` +
       `Bonjour ${product.seller_nom},\n\n` +
       `Votre denrée *${product.nom}* a été approuvée par notre équipe et est maintenant visible sur la plateforme.\n\n` +
       `Merci de votre confiance ! 🌿`;

     await notificationService.sendByPhone(
       product.seller_contact,
       '✅ Denrée approuvée',
       msg,
       { channels: ['whatsapp', 'email', 'inapp'] }
     ).catch(() => {});

    auditLog.logAction({
      adminId: req.user.id, adminNom: req.user.nom,
      action: 'product.approve', targetType: 'product', targetId: id,
      targetLabel: product.nom,
    });
    return res.json({ success: true, message: `Denrée "${product.nom}" approuvée.` });
  } catch (err) {
    console.error('[moderation/approve]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/v1/moderation/:id/reject
router.put('/:id/reject', protect, authorize(['admin']), async (req, res) => {
  try {
    const pool = getMysqlPool();
    const adminId = req.user.id || req.user._id;
    const { id } = req.params;
    const { note = '' } = req.body;

    const [[product]] = await pool.query(
      'SELECT p.*, u.nom AS seller_nom, u.contact AS seller_contact FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = ?',
      [id]
    );
    if (!product) return res.status(404).json({ success: false, message: 'Denrée introuvable' });

    await pool.query(
      `UPDATE products SET moderation_status = 'rejected', moderation_note = ?,
       moderated_by = ?, moderated_at = NOW() WHERE id = ?`,
      [note || null, adminId, id]
    );

     // Notifier l'agriculteur (WhatsApp + Email + message in-app)
     const msg =
       `❌ *VivriMarket — Denrée refusée*\n\n` +
       `Bonjour ${product.seller_nom},\n\n` +
       `Votre denrée *${product.nom}* n'a pas pu être validée.\n\n` +
       (note ? `📝 Motif : ${note}\n\n` : '') +
       `Vous pouvez modifier votre denrée et la soumettre à nouveau.\n` +
       `En cas de question, contactez notre support.`;

     await notificationService.sendByPhone(
       product.seller_contact,
       '❌ Denrée refusée',
       msg,
       { channels: ['whatsapp', 'email', 'inapp'] }
     ).catch(() => {});

    auditLog.logAction({
      adminId: req.user.id, adminNom: req.user.nom,
      action: 'product.reject', targetType: 'product', targetId: id,
      targetLabel: product.nom, details: { note: note || null },
    });
    return res.json({ success: true, message: `Denrée "${product.nom}" rejetée.` });
  } catch (err) {
    console.error('[moderation/reject]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT /api/v1/moderation/:id — modifier les champs d'un produit (admin uniquement)
router.put('/:id', protect, authorize(['admin']), async (req, res) => {
  try {
    const pool = getMysqlPool();
    const adminId = req.user.id || req.user._id;
    const { id } = req.params;

    const EDITABLE = ['nom', 'description', 'prix', 'categorie', 'stock', 'unite', 'etat', 'mensurations'];
    const updates = {};
    EDITABLE.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ à mettre à jour.' });
    }

    const [[product]] = await pool.query('SELECT id, nom FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ success: false, message: 'Denrée introuvable.' });

    const setClauses = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE products SET ${setClauses}, updated_at = NOW() WHERE id = ?`, values);

    auditLog.logAction({
      adminId,
      adminNom: req.user.nom,
      action: 'product.edit',
      targetType: 'product',
      targetId: id,
      targetLabel: product.nom,
      details: { fields: Object.keys(updates) },
    });

    return res.json({ success: true, message: 'Denrée mise à jour.' });
  } catch (err) {
    console.error('[moderation/edit]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/v1/moderation/stats — compteurs pour le badge admin
router.get('/stats', protect, authorize(['admin']), async (req, res) => {
  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query(
      `SELECT moderation_status, COUNT(*) AS cnt
       FROM products GROUP BY moderation_status`
    );
    const stats = { pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => { stats[r.moderation_status] = Number(r.cnt); });
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
