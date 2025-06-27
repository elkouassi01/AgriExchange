const Product = require('../models/Product');

// 📦 Récupérer les produits postés par un agriculteur
const getFarmerProducts = async (req, res) => {
  const farmerId = req.params.id;

  try {
    const produits = await Product.find({ user: farmerId }).sort({ createdAt: -1 });
    res.json(produits);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits de l’agriculteur :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getFarmerDashboard,
  getFarmerProducts
};
