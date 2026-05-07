const express = require('express');
const router = express.Router();
const { isMysql } = require('../utils/authHelpers');
const mysqlPaymentRepository = require('../repositories/mysqlPaymentRepository');
const mysqlProductRepository = require('../repositories/mysqlProductRepository');
const mysqlContactRequestRepository = require('../repositories/mysqlContactRequestRepository');
const { sendWhatsApp } = require('../utils/whatsappClient');

const CINETPAY_APIKEY = process.env.CINETPAY_APIKEY || '8937149296838988c80faf0.18612017';
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID || '105896693';
const VIEW_PRICE = 300;

// POST /api/v1/product-payments/webhook — CinetPay notification
router.post('/webhook', async (req, res) => {
  const data = req.body;
  console.log('[ProductPayment] Webhook:', JSON.stringify(data));

  try {
    const txId = data.transaction_id || data.cpm_trans_id;
    if (!txId) return res.status(400).send('Missing transaction_id');

    const isAccepted = data.status === 'ACCEPTED' || data.cpm_result === '00';
    if (isAccepted && isMysql()) {
      await mysqlPaymentRepository.markAsPaid(txId);
      console.log(`[ProductPayment] Paid: ${txId}`);
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
        return res.status(404).json({ success: false, message: 'Produit non trouvé' });
      }
    }

    const transactionId = `PV${Date.now()}`;
    const origin = req.headers.origin || process.env.CLIENT_URL || 'https://vivrimarket.com';
    const serverUrl = process.env.SERVER_URL || 'https://vivrimarket.com';

    const paymentData = {
      apikey: CINETPAY_APIKEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: VIEW_PRICE,
      currency: 'XOF',
      description: `Coordonnées vendeur - Produit #${productId}`,
      customer_name: (req.body.customer_name || 'Visiteur').substring(0, 50),
      customer_email: req.body.customer_email || 'guest@vivrimarket.com',
      customer_phone_number: '',
      notify_url: `${serverUrl}/api/v1/product-payments/webhook`,
      return_url: `${origin}/produits/${productId}?tx_id=${transactionId}`,
      cancel_url: `${origin}/produits/${productId}`,
      channels: 'ALL',
      lang: 'fr',
    };

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (result.code === '201' && result.data?.payment_url) {
      if (isMysql()) {
        await mysqlPaymentRepository.createPendingPayment(transactionId, productId);
      }
      return res.json({
        success: true,
        payment_url: result.data.payment_url,
        transaction_id: transactionId,
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
  const { tx_id, buyer_phone } = req.query;

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
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
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
        });

        const ferme = seller.fermeNom || seller.nom || 'vendeur';
        const msg =
          `🛒 *VivriMarket* — Nouveau contact !\n\n` +
          `Bonjour *${ferme}* 👋\n\n` +
          `Un acheteur est intéressé par votre produit :\n` +
          `📦 *${product.nom}*\n\n` +
          `Répondez *OUI* pour confirmer votre disponibilité.\n` +
          `⏰ Vous avez *24 heures* pour répondre.\n\n` +
          `_Sans réponse, votre étale sera suspendu et l'acheteur remboursé._\n` +
          `— VivriMarket 🌾`;

        sendWhatsApp(seller.contact, msg).catch(console.error);
      }
    }

    return res.json({ success: true, paid: true, seller });
  } catch (err) {
    console.error('[ProductPayment] Check error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
