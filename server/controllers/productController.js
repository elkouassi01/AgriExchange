const mysqlProductRepository = require('../repositories/mysqlProductRepository');
const { isMysql } = require('../utils/authHelpers');

exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      categorie,
      etat,
      minPrix,
      maxPrix,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Si PostgreSQL actif mais non connecté, on retourne un résultat vide proprement
    if (isMysql()) {
      try {
        const result = await mysqlProductRepository.listProducts(
          { page, limit, categorie, etat, minPrix, maxPrix, search, sortBy, sortOrder },
          { onlyInStock: false }
        );

        return res.status(200).json({
          success: true,
          count: result.totalDocs,
          data: result.docs,
          pagination: {
            currentPage: result.page,
            totalPages: result.totalPages,
            totalProducts: result.totalDocs,
            hasNext: result.hasNextPage,
            hasPrev: result.hasPrevPage,
            limit: result.limit,
          },
        });
      } catch (err) {
        // PostgreSQL non disponible - retourne liste vide
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
          pagination: { currentPage: 1, totalPages: 0, totalProducts: 0, hasNext: false, hasPrev: false, limit: 10 },
        });
      }
    }

    return res.status(501).json({
      success: false,
      message: 'Mode non supporté',
    });
  } catch (error) {
    console.error('ERREUR GET PRODUCTS:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    if (isMysql()) {
      try {
        const product = await mysqlProductRepository.findProductById(req.params.id);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Produit non trouvé',
          });
        }
        return res.status(200).json({
          success: true,
          data: product,
        });
      } catch (err) {
        return res.status(200).json({
          success: true,
          data: null,
        });
      }
    }

    return res.status(501).json({
      success: false,
      message: 'Mode non supporté',
    });
  } catch (error) {
    console.error('ERREUR GET PRODUCT:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};