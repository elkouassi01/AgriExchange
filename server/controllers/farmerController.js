const Product = require('../models/Product');
const mysqlProductRepository = require('../repositories/mysqlProductRepository');
const mysqlFermeRepository = require('../repositories/mysqlFermeRepository');
const { isMysql } = require('../utils/authHelpers');

const getFarmerProducts = async (req, res) => {
  const farmerId = req.params.id;

  try {
    const produits = isMysql()
      ? await mysqlProductRepository.listProducts({ sellerId: farmerId })
      : await Product.find({ sellerId: farmerId }).sort({ createdAt: -1 });

    res.json(produits);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits de l\'agriculteur :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getFarmerDashboard = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const fermes = isMysql()
      ? await mysqlFermeRepository.getFermesByUserId(userId)
      : [];

    const produits = isMysql()
      ? await mysqlProductRepository.listProducts({ sellerId: userId })
      : await Product.find({ sellerId: userId });

    res.json({
      fermes,
      products: produits.docs || produits,
    });
  } catch (error) {
    console.error('Erreur dashboard agriculteur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const createFerme = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { nomFerme, typeExploitation, localisation, superficie, dateFin } = req.body;

    if (!nomFerme || !typeExploitation || !localisation) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const ferme = isMysql()
      ? await mysqlFermeRepository.createFerme({
          userId,
          nomFerme,
          typeExploitation,
          localisation,
          superficie,
          dateFin,
        })
      : null;

    if (!isMysql()) {
      return res.status(501).json({ message: 'Mode MongoDB non implémenté' });
    }

    res.status(201).json({ success: true, ferme });
  } catch (error) {
    console.error('Erreur création ferme:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getFarmerDashboard,
  getFarmerProducts,
  createFerme,
};