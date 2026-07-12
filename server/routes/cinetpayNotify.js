// routes/cinetpayNotify.js
// Webhook CinetPay — appelé par CinetPay après chaque paiement
// IMPORTANT (doc CinetPay) : ne jamais faire confiance au statut dans le payload.
// Toujours re-vérifier via GET /v1/payment/{merchantTransactionId} avant d'agir.
const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const paymentService = require('../utils/paymentService');
const paymentTransactions = require('../utils/paymentTransactions');
const mysqlPaymentRepository = require('../repositories/mysqlPaymentRepository');
const { getMysqlPool } = require('../config/mysql');

// Crée la table pending_registrations si absente (auto-migrate)
let tableReady = false;
async function ensurePendingTable() {
  if (tableReady) return;
  const pool = getMysqlPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id   VARCHAR(100) NOT NULL UNIQUE,
      nom              VARCHAR(100) NOT NULL,
      email            VARCHAR(150) NOT NULL,
      mot_de_passe     VARCHAR(255) NOT NULL,
      contact          VARCHAR(30)  NOT NULL,
      role             VARCHAR(20)  DEFAULT 'agriculteur',
      formule          VARCHAR(20)  DEFAULT 'BLEU',
      ferme_nom        VARCHAR(100) NULL,
      localisation     VARCHAR(200) NULL,
      type_exploitation VARCHAR(100) NULL,
      surface          VARCHAR(100) NULL,
      description      TEXT         NULL,
      amount           INT          NOT NULL DEFAULT 0,
      status           ENUM('pending','completed','failed') DEFAULT 'pending',
      created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      expires_at       TIMESTAMP    NULL,
      INDEX idx_tx  (transaction_id),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

router.post('/cinetpay-notify', async (req, res) => {
  // CinetPay exige une réponse 200 rapide — on répond avant de traiter
  res.status(200).send('OK');

  try {
    const txId = req.body.transaction_id || req.body.cpm_trans_id;
    if (!txId) {
      console.warn('[CinetPay Notify] Payload sans transaction_id');
      return;
    }

    console.log('[CinetPay Notify] Vérification →', txId);

    // Re-vérification obligatoire via l'API CinetPay (sécurité)
    let result;
    try {
      const providerId = await paymentTransactions.getProvider(txId);
      result = await paymentService.checkPayment(providerId, txId);
    } catch (e) {
      console.error('[CinetPay Notify] Échec checkPayment:', e.message);
      return;
    }

    const paid = result.accepted;
    console.log('[CinetPay Notify]', txId, '→', result.raw?.status, paid ? '✅ PAYÉ' : '⏳ NON PAYÉ');

    if (!paid) return;

    // Marquer le paiement produit si existant
    try {
      await mysqlPaymentRepository.markAsPaid(txId);
    } catch (_) {}

    // Compléter l'inscription en attente si elle existe
    await ensurePendingTable();
    const pool = getMysqlPool();

    const [[reg]] = await pool.query(
      `SELECT * FROM pending_registrations WHERE transaction_id = ? AND status = 'pending' LIMIT 1`,
      [txId]
    );

    if (!reg) return;

    // Vérifier si l'email est déjà utilisé
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [reg.email]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE pending_registrations SET status = 'completed' WHERE transaction_id = ?`,
        [txId]
      );
      console.log('[CinetPay Notify] Email déjà utilisé, inscription marquée complète:', reg.email);
      return;
    }

    const userId = randomUUID();
    await pool.query(
      `INSERT INTO users
       (id, nom, email, mot_de_passe, contact, role, ferme_nom, localisation,
        type_exploitation, surface, description, is_verified, est_actif, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW())`,
      [
        userId,
        reg.nom,
        reg.email,
        reg.mot_de_passe,
        reg.contact,
        reg.role || 'agriculteur',
        reg.ferme_nom   || null,
        reg.localisation || null,
        reg.type_exploitation || null,
        reg.surface     || null,
        reg.description || null,
      ]
    );

    // Créer l'abonnement si c'est un agriculteur
    if (reg.role === 'agriculteur' && reg.formule) {
      const durations = { BLEU: 1, GOLD: 3, PLATINUM: 6 };
      const months = durations[reg.formule] || 1;
      const dateFin = new Date();
      dateFin.setMonth(dateFin.getMonth() + months);

      await pool.query(
        `INSERT INTO abonnements (user_id, formule, date_debut, date_fin, montant, statut)
         VALUES (?, ?, NOW(), ?, ?, 'actif')
         ON DUPLICATE KEY UPDATE formule = VALUES(formule), date_fin = VALUES(date_fin), statut = 'actif'`,
        [userId, reg.formule, dateFin, reg.amount || 0]
      ).catch(() => {});
    }

    await pool.query(
      `UPDATE pending_registrations SET status = 'completed' WHERE transaction_id = ?`,
      [txId]
    );

    console.log('[CinetPay Notify] ✅ Utilisateur créé:', reg.email, '| rôle:', reg.role, '| formule:', reg.formule);
  } catch (err) {
    console.error('[CinetPay Notify] Erreur:', err.message);
  }
});

module.exports = router;
