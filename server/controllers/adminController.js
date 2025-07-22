const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Abonnement = require('../models/Abonnement');
const moment = require('moment');

// ==================== DASHBOARD STATS ==================== //
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalConsumers,
      totalRevenueData,
      activeSubscriptions,
      transactionsCounts,
      recentTransactions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'agriculteur' }),
      User.countDocuments({ role: 'consommateur' }),
      Transaction.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$montant' } } },
      ]),
      Abonnement.aggregate([
        { $match: { dateExpiration: { $gte: new Date() } } },
        { $group: { _id: '$formule', count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Transaction.find().sort({ createdAt: -1 }).limit(5).populate('user', 'nom email')
    ]);

    const lastMonth = moment().subtract(1, 'month');
    const [lastMonthUsers, lastMonthFarmers, lastMonthConsumers] = await Promise.all([
      User.countDocuments({ createdAt: { $lt: lastMonth.toDate() } }),
      User.countDocuments({ role: 'agriculteur', createdAt: { $lt: lastMonth.toDate() } }),
      User.countDocuments({ role: 'consommateur', createdAt: { $lt: lastMonth.toDate() } })
    ]);

    const calculateGrowth = (current, previous) => 
      previous > 0 ? ((current - previous) / previous * 100).toFixed(2) : current > 0 ? 100 : 0;

    const userGrowth = calculateGrowth(totalUsers, lastMonthUsers);
    const farmerGrowth = calculateGrowth(totalFarmers, lastMonthFarmers);
    const consumerGrowth = calculateGrowth(totalConsumers, lastMonthConsumers);

    const totalRevenue = totalRevenueData[0]?.total || 0;

    const transactionStatus = {
      success: 0,
      pending: 0,
      failed: 0
    };
    
    transactionsCounts.forEach(item => {
      transactionStatus[item._id] = item.count;
    });

    const sixMonthsAgo = moment().subtract(6, 'months').startOf('month');
    const monthlyActivity = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo.toDate() }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$montant' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const activityData = monthlyActivity.map(item => ({
      mois: moment(`${item._id.year}-${item._id.month}`, 'YYYY-M').format('MMM'),
      transactions: item.count,
      revenue: item.amount
    }));

    res.json({
      users: {
        total: totalUsers,
        farmers: totalFarmers,
        consumers: totalConsumers,
        growth: {
          total: userGrowth,
          farmers: farmerGrowth,
          consumers: consumerGrowth
        }
      },
      revenue: {
        total: totalRevenue,
        growth: 6
      },
      subscriptions: activeSubscriptions.map(item => ({
        formule: item._id,
        count: item.count
      })),
      transactions: {
        total: transactionStatus.success + transactionStatus.pending + transactionStatus.failed,
        completed: transactionStatus.success,
        pending: transactionStatus.pending,
        failed: transactionStatus.failed
      },
      recentTransactions: recentTransactions.map(tx => ({
        id: tx._id,
        user: tx.user ? { id: tx.user._id, name: tx.user.nom } : null,
        amount: tx.montant,
        date: tx.createdAt,
        status: tx.status
      })),
      activityData
    });
  } catch (error) {
    res.status(500).json({ 
      code: 'ADMIN_DASHBOARD_ERROR',
      message: 'Échec de récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// ==================== USER MANAGEMENT ==================== //
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-motDePasse')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query)
    ]);

    res.json({
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    res.status(500).json({ 
      code: 'USER_FETCH_ERROR',
      message: 'Échec de récupération des utilisateurs'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-motDePasse')
      .populate('abonnements');
    
    if (!user) {
      return res.status(404).json({ 
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      code: 'USER_FETCH_ERROR',
      message: 'Échec de récupération de l\'utilisateur'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    delete updates.motDePasse;
    delete updates.role;
    delete updates.dateCreation;
    
    const user = await User.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true 
    }).select('-motDePasse');
    
    if (!user) {
      return res.status(404).json({ 
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json(user);
  } catch (error) {
    const status = error.name === 'ValidationError' ? 400 : 500;
    const message = error.name === 'ValidationError' 
      ? 'Données de mise à jour invalides' 
      : 'Échec de mise à jour de l\'utilisateur';
    
    res.status(status).json({ 
      code: 'USER_UPDATE_ERROR',
      message,
      errors: error.errors ? Object.values(error.errors).map(e => e.message) : undefined
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['agriculteur', 'consommateur', 'admin'].includes(role)) {
      return res.status(400).json({
        code: 'INVALID_ROLE',
        message: 'Rôle invalide'
      });
    }
    
    const user = await User.findByIdAndUpdate(id, { role }, { 
      new: true,
      runValidators: true 
    }).select('-motDePasse');
    
    if (!user) {
      return res.status(404).json({ 
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      code: 'ROLE_UPDATE_ERROR',
      message: 'Échec de mise à jour du rôle'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé' 
      });
    }

    user.email = `disabled_${Date.now()}_${user.email}`;
    user.status = 'disabled';
    await user.save();
    
    res.json({ 
      message: 'Utilisateur désactivé avec succès',
      userId: user._id,
      newStatus: user.status
    });
  } catch (error) {
    res.status(500).json({ 
      code: 'USER_DELETE_ERROR',
      message: 'Échec de désactivation de l\'utilisateur'
    });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const [transactions, abonnements] = await Promise.all([
      Transaction.find({ user: id }).sort({ createdAt: -1 }).limit(10),
      Abonnement.find({ utilisateur: id }).sort({ dateDebut: -1 })
    ]);
    
    res.json({
      transactions,
      abonnements
    });
  } catch (error) {
    res.status(500).json({ 
      code: 'USER_ACTIVITY_ERROR',
      message: 'Échec de récupération des activités'
    });
  }
};

// ==================== TRANSACTIONS & SUBSCRIPTIONS ==================== //
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};
    
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('user', 'nom email'),
      Transaction.countDocuments(query)
    ]);

    res.json({
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    res.status(500).json({ 
      code: 'TRANSACTION_FETCH_ERROR',
      message: 'Échec de récupération des transactions'
    });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    
    if (status === 'active') {
      query.dateExpiration = { $gte: new Date() };
    } else if (status === 'expired') {
      query.dateExpiration = { $lt: new Date() };
    } else if (status === 'pending') {
      query.status = 'pending';
    }

    const [abonnements, total] = await Promise.all([
      Abonnement.find(query)
        .sort({ dateDebut: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('utilisateur', 'nom email'),
      Abonnement.countDocuments(query)
    ]);

    res.json({
      data: abonnements,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    res.status(500).json({ 
      code: 'SUBSCRIPTION_FETCH_ERROR',
      message: 'Échec de récupération des abonnements'
    });
  }
};

// ==================== CLEANUP OBSOLETE FIELDS ==================== //
// ⭐ CRITICAL FIX: Renamed function to match route reference
const cleanupObsoleteFields = async (req, res) => {
  try {
    const result = await User.updateMany(
      {},
      {
        $unset: {
          "abonnement.vuesUtilisees": "",
          "abonnement.derniereVue": ""
        }
      }
    );

    res.json({
      message: '✅ Champs obsolètes supprimés avec succès.',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      code: 'USER_CLEANUP_ERROR',
      message: '❌ Erreur lors du nettoyage des champs obsolètes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
  getUserActivity,
  getTransactions,
  getSubscriptions,
  cleanupObsoleteFields // ⭐ Fixed export name
};