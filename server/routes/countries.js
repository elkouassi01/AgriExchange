const express = require('express');
const router = express.Router();

router.get('/calling-codes', async (req, res) => {
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=idd,name,flags');
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Erreur lors de la récupération des données' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[countries/calling-codes]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
