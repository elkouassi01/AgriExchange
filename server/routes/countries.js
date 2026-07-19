const express = require('express');
const router = express.Router();
const CALLING_CODES = require('../data/callingCodes');

// Liste statique (voir server/data/callingCodes.js) — l'ancien appel à
// restcountries.com/v3.1 est mort : cette API renvoie désormais HTTP 200
// avec un message de dépréciation au lieu des données, ce qui cassait le
// sélecteur d'indicatif sur les pages d'inscription.
router.get('/calling-codes', (req, res) => {
  res.json(CALLING_CODES);
});

module.exports = router;
