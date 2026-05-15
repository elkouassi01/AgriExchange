// routes/paiement.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const cinetpay = require('../utils/cinetpayService');

// Valider le paiement après redirection ou via webhook
router.post('/valider', async (req, res) => {
  const { transaction_id, nom, email, motDePasse, telephone, role, localisation, forfait } = req.body;

  try {
    // Vérifier auprès de CinetPay si le paiement est réussi
    const result = await cinetpay.checkPayment(transaction_id);

    if (cinetpay.isAccepted(result)) {
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
