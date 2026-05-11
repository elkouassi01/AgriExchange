const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const repo = require('../repositories/mysqlContactRequestRepository');
const notificationService = require('../utils/notificationService');
const { protect, authorize } = require('../middlewares/auth');

// ─── Traitement des réponses WhatsApp vendeur ─────────────────────────────────
const handleVendorReply = async (msg) => {
  try {
    const body = (msg.body || '').trim().toUpperCase();
    if (body !== 'OUI') return;

    // Extraire le numéro de l'expéditeur : "2250700000001@c.us" → "+2250700000001"
    const rawPhone = msg.from.replace('@c.us', '');
    const phone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

    const request = await repo.findPendingBySellerPhone(phone);
    if (!request) return;

    await repo.markResponded(request.id);

    // Confirmer au vendeur (WhatsApp + Email + in-app)
    const msgVendeur =
      `✅ *VivriMarket* — Merci pour votre réponse !\n\n` +
      `Vous êtes maintenant en contact avec l'acheteur.\n` +
      `Bonne transaction ! 🌾`;
    await notificationService.sendByPhone(
      phone,
      '✅ Réponse enregistrée',
      msgVendeur,
      { channels: ['whatsapp', 'email', 'inapp'] }
    );

    // Notifier l'acheteur si on a son numéro
    if (request.buyer_phone) {
      const ferme = request.seller_ferme_nom || 'le vendeur';
      const msgAcheteur =
        `✅ *VivriMarket* — Le vendeur a confirmé !\n\n` +
        `*${ferme}* est disponible pour votre commande de :\n` +
        `📦 *${request.product_nom}*\n\n` +
        `Vous pouvez le contacter directement.\n` +
        `Bonne transaction ! 🛒`;
      await notificationService.sendByPhone(
        request.buyer_phone,
        '✅ Vendeur disponible',
        msgAcheteur,
        { channels: ['whatsapp', 'email', 'inapp'] }
      ).catch(() => {});
    }

    console.log(`[ContactRequest] Réponse OUI de ${phone} pour produit ${request.product_id}`);
  } catch (err) {
    console.error('[ContactRequest] handleVendorReply error:', err.message);
  }
};

// ─── Cron job : vérifie les demandes expirées toutes les heures ───────────────
const startContactRequestCron = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Vérification des demandes de contact expirées...');
    try {
      const expired = await repo.getExpiredPending();
      if (expired.length === 0) return;

      for (const req of expired) {
        await repo.markExpired(req.id);
        await repo.suspendSeller(req.seller_id);

         // Notifier le vendeur de la suspension (multi-canal)
         const msgSuspension =
           `⚠️ *VivriMarket* — Étale suspendu\n\n` +
           `Bonjour *${req.seller_nom}*,\n\n` +
           `Vous n'avez pas répondu à une demande de contact dans les 24h.\n` +
           `Votre étale est *suspendu*.\n\n` +
           `💸 L'acheteur a été remboursé de *300 FCFA* par VivriMarket.\n\n` +
           `Pour être réactivé, contactez VivriMarket et réglez les *300 FCFA* de pénalité.\n` +
           `📞 vivrimarket.com`;

         await notificationService.sendByPhone(
           req.seller_phone,
           '⚠️ Étale suspendu',
           msgSuspension,
           { channels: ['whatsapp', 'email', 'inapp'] }
         ).catch(() => {});

        console.log(`[Cron] Vendeur ${req.seller_id} suspendu (demande ${req.id} expirée)`);
      }

      console.log(`[Cron] ${expired.length} demande(s) expirée(s) traitée(s)`);
    } catch (err) {
      console.error('[Cron] Erreur traitement expirés:', err.message);
    }
  });

  console.log('[Cron] Surveillance contact_requests démarrée (toutes les heures)');
};

// ─── Route admin : liste des remboursements à effectuer ──────────────────────
router.get('/pending-refunds', protect, authorize(['admin']), async (req, res) => {
  try {
    const refunds = await repo.getPendingRefunds();
    return res.json({ success: true, data: refunds });
  } catch (err) {
    console.error('[ContactRequest] pending-refunds error:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route admin : marquer un remboursement comme effectué
router.post('/:id/mark-refunded', protect, authorize(['admin']), async (req, res) => {
  try {
    await repo.markRefunded(req.params.id);
    return res.json({ success: true, message: 'Remboursement enregistré' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route admin : réactiver un vendeur après paiement pénalité
router.post('/:sellerId/reactivate', protect, authorize(['admin']), async (req, res) => {
  try {
    const { getMysqlPool } = require('../config/mysql');
    const pool = getMysqlPool();
    await pool.query(
      `UPDATE users SET suspended = 0, penalty_amount = 0, suspended_at = NULL WHERE id = ?`,
      [req.params.sellerId]
    );
    return res.json({ success: true, message: 'Vendeur réactivé' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
module.exports.handleVendorReply = handleVendorReply;
module.exports.startContactRequestCron = startContactRequestCron;
