const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { isMysql } = require('../utils/authHelpers');
const mysqlPaymentRepository = require('../repositories/mysqlPaymentRepository');
const mysqlProductRepository = require('../repositories/mysqlProductRepository');
const mysqlContactRequestRepository = require('../repositories/mysqlContactRequestRepository');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const notificationService = require('../utils/notificationService');

const cinetpay = require('../utils/cinetpayService');
const PRICE_VISITOR = 300;
const PRICE_CONSUMER = 150;

// Vérifie optionnellement le JWT (cookie httpOnly ou Bearer header) — retourne le payload ou null
const optionalAuth = (req) => {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// POST /api/v1/product-payments/webhook — CinetPay notification
router.post('/webhook', async (req, res) => {
  const data = req.body;

  try {
    const txId = data.transaction_id || data.cpm_trans_id;
    if (!txId) return res.status(400).send('Missing transaction_id');

    // Ne pas faire confiance au corps du webhook : re-vérifier auprès de CinetPay
    const verifyResult = await cinetpay.checkPayment(txId);
    const isAccepted = cinetpay.isAccepted(verifyResult);

    if (isAccepted && isMysql()) {
      await mysqlPaymentRepository.markAsPaid(txId);
    }
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[ProductPayment] Webhook error:', err);
    return res.status(500).send('Error');
  }
});

// POST /api/v1/product-payments/:productId/initiate
router.post('/:productId/initiate', async (req, res) => {
  const { productId } = req.params;

  try {
    if (isMysql()) {
      const product = await mysqlProductRepository.findProductById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Denrée introuvable' });
      }
    }

    // Tarif selon le statut du demandeur
    const decoded = optionalAuth(req);
    const isConsumer = decoded?.role === 'consommateur';
    const amount = isConsumer ? PRICE_CONSUMER : PRICE_VISITOR;

    const transactionId = `PV${randomUUID().replace(/-/g, '')}`;
    const origin = req.headers.origin || process.env.CLIENT_URL || 'https://vivrimarket.com';
    const serverUrl = process.env.SERVER_URL || 'https://vivrimarket.com';

    const nameParts = (req.body.customer_name || 'Visiteur').substring(0, 50).split(' ');
    const result = await cinetpay.initPayment({
      merchantTransactionId: transactionId,
      amount,
      designation:    `Coordonnées vendeur - Denrée #${productId}`,
      clientFirstName: nameParts[0] || 'Visiteur',
      clientLastName:  nameParts.slice(1).join(' ') || '-',
      clientEmail:    req.body.customer_email || 'guest@vivrimarket.com',
      successUrl:     `${origin}/produits/${productId}?tx_id=${transactionId}`,
      failedUrl:      `${origin}/produits/${productId}`,
      notifyUrl:      `${serverUrl}/api/v1/product-payments/webhook`,
    });

    if (result.payment_url) {
      if (isMysql()) {
        await mysqlPaymentRepository.createPendingPayment(transactionId, productId);
      }
      return res.json({
        success: true,
        payment_url: result.payment_url,
        transaction_id: transactionId,
        amount,
      });
    }

    return res.status(400).json({
      success: false,
      message: result.message || 'Erreur initialisation paiement',
    });
  } catch (err) {
    console.error('[ProductPayment] Initiate error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/v1/product-payments/:productId/check?tx_id=xxx
router.get('/:productId/check', async (req, res) => {
  const { productId } = req.params;
  const { tx_id, buyer_phone, buyer_email } = req.query;

  if (!tx_id) {
    return res.status(400).json({ success: false, message: 'tx_id requis' });
  }

  try {
    if (!isMysql()) {
      return res.status(400).json({ success: false, message: 'Fonctionnalité non disponible' });
    }

    const payment = await mysqlPaymentRepository.checkPaymentForProduct(tx_id, productId);
    if (!payment || payment.status !== 'paid') {
      return res.json({ success: false, paid: false });
    }

    const product = await mysqlProductRepository.findProductById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Denrée introuvable' });
    }

    const seller = {
      nom: product.vendeur?.nom || null,
      email: product.vendeur?.email || null,
      contact: product.vendeur?.contact || null,
      fermeNom: product.vendeur?.fermeNom || null,
      adresse: product.vendeur?.adresse || null,
      typeExploitation: product.vendeur?.description || null,
    };

    // Envoyer WhatsApp au vendeur (une seule fois par paiement)
    if (seller.contact) {
      const existing = await mysqlContactRequestRepository.findPendingBySellerPhone(seller.contact);
      if (!existing) {
        await mysqlContactRequestRepository.ensureTables();
        await mysqlContactRequestRepository.createContactRequest({
          paymentId: tx_id,
          productId,
          productNom: product.nom,
          sellerId: product.sellerId,
          sellerPhone: seller.contact,
          buyerPhone: buyer_phone || null,
          buyerEmail: buyer_email || null,
        });

         // Confirmation WhatsApp + Email à l'acheteur
         if (buyer_phone) {
           const confirmMsg =
             `✅ *VivriMarket* — Paiement reçu !\n\n` +
             `Merci pour votre paiement pour la denrée :\n` +
             `📦 *${product.nom}*\n\n` +
             `Le vendeur a *24 heures* pour confirmer sa disponibilité.\n` +
             `Vous serez notifié ici dès sa réponse.\n\n` +
             `— VivriMarket 🌾`;

           await notificationService.sendByPhone(
             buyer_phone,
             '✅ Paiement confirmé',
             confirmMsg,
             { channels: ['whatsapp', 'email', 'inapp'] }
           ).catch(() => {});
         }

         const ferme = seller.fermeNom || seller.nom || 'vendeur';
         const msg =
           `🛒 *VivriMarket* — Nouveau contact !\n\n` +
           `Bonjour *${ferme}* 👋\n\n` +
           `Un acheteur est intéressé par votre denrée :\n` +
           `📦 *${product.nom}*\n\n` +
           `Répondez *OUI* pour confirmer votre disponibilité.\n` +
           `⏰ Vous avez *24 heures* pour répondre.\n\n` +
           `_Sans réponse, votre étale sera suspendu et l'acheteur remboursé._\n` +
           `— VivriMarket 🌾`;

         await notificationService.sendByPhone(
           seller.contact,
           '🛒 Nouvel acheteur intéressé',
           msg,
           { channels: ['whatsapp', 'email', 'inapp'] }
         ).catch(console.error);
      }
    }

    return res.json({ success: true, paid: true, seller });
  } catch (err) {
    console.error('[ProductPayment] Check error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
