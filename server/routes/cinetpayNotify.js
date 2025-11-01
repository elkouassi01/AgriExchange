// routes/cinetpayNotify.js
const express = require('express');
const router = express.Router();

// Exemple : création d'un modèle de paiement (optionnel)
const mongoose = require('mongoose');
const Payment = mongoose.model('Payment', new mongoose.Schema({
  transaction_id: String,
  amount: Number,
  currency: String,
  status: String,
  operator_id: String,
  payment_method: String,
  payment_date: String,
}, { timestamps: true }));

router.post('/cinetpay-notify', async (req, res) => {
  try {
    const data = req.body;
    console.log('🔔 Notification CinetPay reçue :', data);

    if (!data.transaction_id || !data.status) {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }

    // Tu peux ajouter ici une logique pour enregistrer dans la base
    const paiement = await Payment.create({
      transaction_id: data.transaction_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      operator_id: data.operator_id,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
    });

    console.log('✅ Paiement enregistré :', paiement.transaction_id);

    res.status(200).send('OK'); // Important pour que CinetPay ne relance pas la notification
  } catch (error) {
    console.error('❌ Erreur dans cinetpay-notify:', error);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
