// routes/paiement.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;

// Valider le paiement après redirection ou via webhook
router.post('/valider', async (req, res) => {
  const { transaction_id, nom, email, motDePasse, telephone, role, localisation, forfait } = req.body;

  try {
    // Vérifier auprès de CinetPay si le paiement est réussi
    const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment/check', {
      transaction_id,
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID
    });

    const status = response.data.data.status;

    if (status === 'ACCEPTED') {
      // Créer et enregistrer l'utilisateur
      const nouvelUser = new User({
        nom,
        email,
        motDePasse,
        telephone,
        role,
        localisation,
        forfait: role === 'consommateur' ? forfait : null,
        forfaitDateDebut: role === 'consommateur' ? new Date() : null,
        transaction_id,
        statut_paiement: 'reussi'
      });

      await nouvelUser.save();

      return res.status(201).json({ message: 'Utilisateur enregistré avec succès après paiement.', userId: nouvelUser._id });
    } else {
      return res.status(400).json({ message: 'Paiement non accepté.' });
    }

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Erreur serveur lors de la vérification du paiement.' });
  }
});

module.exports = router;
