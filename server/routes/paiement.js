// routes/paiement.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const paymentService = require('../utils/paymentService');
const paymentTransactions = require('../utils/paymentTransactions');
const { getMysqlPool } = require('../config/mysql');

// Auto-migrate : crée la table si absente
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

// POST /api/v1/paiement/initiate
// Initie un paiement CinetPay et sauvegarde l'inscription en attente
router.post('/initiate', async (req, res) => {
  const {
    amount,
    description,
    customer_name,
    customer_email,
    customer_phone,
    notify_url,
    return_url,
    cancel_url,
    // Données d'inscription (facultatif — si présentes, enregistrées en attente)
    nom,
    motDePasse,
    contact,
    role,
    formule,
    fermeNom,
    localisation,
    typeExploitation,
    surface,
    userDescription,
  } = req.body;

  if (!amount || !notify_url || !return_url) {
    return res.status(400).json({ success: false, message: 'Paramètres manquants' });
  }

  try {
    const transactionId = 'CP' + Date.now() + randomUUID().replace(/-/g, '').substring(0, 8);
    const providerId = await paymentService.getActiveProviderId();

    const nameParts = (customer_name || nom || 'Client').substring(0, 50).split(' ');
    const result = await paymentService.initPayment(providerId, {
      transactionId,
      amount: parseInt(amount, 10),
      description: description || 'Paiement VivriMarket',
      clientFirstName: nameParts[0] || 'Client',
      clientLastName: nameParts.slice(1).join(' ') || 'NA',
      clientEmail: customer_email || 'guest@vivrimarket.com',
      clientPhone: customer_phone || '',
      successUrl: return_url,
      failedUrl: cancel_url || return_url,
      notifyUrl: notify_url,
    });

    if (!result.paymentUrl) {
      console.error('[paiement/initiate] Pas de paymentUrl:', result);
      return res.status(400).json({ success: false, message: result.message || 'Erreur initialisation paiement' });
    }

    await paymentTransactions.record(transactionId, providerId);

    // Les consommateurs n'ont plus de formule d'abonnement payante (paiement à
    // l'unité uniquement pour débloquer un contact vendeur, cf. productPayments.js)
    // — on force formule à null pour ce rôle même si le client en a envoyé une,
    // pour ne jamais activer d'abonnement consommateur côté webhook.
    const safeFormule = role === 'consommateur' ? null : (formule || 'BLEU');

    // Sauvegarder l'inscription en attente si les données utilisateur sont fournies
    if (nom && motDePasse && (customer_email || contact)) {
      try {
        await ensurePendingTable();
        const hashedPassword = await bcrypt.hash(motDePasse, 12);
        const pool = getMysqlPool();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // expire dans 24h

        await pool.query(
          `INSERT INTO pending_registrations
           (transaction_id, nom, email, mot_de_passe, contact, role, formule,
            ferme_nom, localisation, type_exploitation, surface, description, amount, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = 'pending'`,
          [
            transactionId,
            nom.substring(0, 100),
            (customer_email || '').toLowerCase(),
            hashedPassword,
            (contact || customer_phone || '').replace(/\D/g, '').substring(0, 30),
            role || 'agriculteur',
            safeFormule,
            fermeNom  || null,
            localisation || null,
            typeExploitation || null,
            surface   || null,
            userDescription || null,
            parseInt(amount, 10),
            expiresAt,
          ]
        );
        console.log('[paiement/initiate] Inscription en attente sauvegardée:', customer_email, transactionId);
      } catch (dbErr) {
        // Non bloquant — le paiement peut continuer, le webhook retentera
        console.error('[paiement/initiate] Erreur sauvegarde pending:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      payment_url: result.paymentUrl,
      transaction_id: transactionId,
      amount: parseInt(amount, 10),
    });
  } catch (error) {
    console.error('[paiement/initiate]', error.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'initialisation du paiement' });
  }
});

// GET /api/v1/paiement/status/:txId — vérifie le statut d'un paiement
router.get('/status/:txId', async (req, res) => {
  const { txId } = req.params;
  if (!txId) return res.status(400).json({ success: false, message: 'txId requis' });

  try {
    const providerId = await paymentTransactions.getProvider(txId);
    const result = await paymentService.checkPayment(providerId, txId);
    const paid = result.accepted;

    // Vérifier aussi si l'inscription a été complétée
    let inscriptionCompleted = false;
    try {
      await ensurePendingTable();
      const pool = getMysqlPool();
      const [[reg]] = await pool.query(
        `SELECT status, email FROM pending_registrations WHERE transaction_id = ? LIMIT 1`,
        [txId]
      );
      inscriptionCompleted = reg?.status === 'completed';
    } catch (_) {}

    return res.json({
      success: true,
      paid,
      status: paid ? 'SUCCESS' : (result.raw?.status || 'PENDING'),
      inscriptionCompleted,
    });
  } catch (error) {
    console.error('[paiement/status]', error.message);
    return res.status(500).json({ success: false, message: 'Erreur vérification statut' });
  }
});

module.exports = router;
