const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const mysqlTransactionRepository = require('../repositories/mysqlTransactionRepository');
const mysqlAbonnementRepository = require('../repositories/mysqlAbonnementRepository');
const { getMysqlPool } = require('../config/mysql');

const sanitizeUser = (user) => {
  if (!user) return null;
  const { motDePasse, mot_de_passe, ...rest } = user;
  return rest;
};

const getDashboardStats = async (req, res) => {
  try {
    const pool = getMysqlPool();

    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'agriculteur') AS total_farmers,
        (SELECT COUNT(*) FROM users WHERE role = 'consommateur') AS total_consumers,
        (SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE status = 'completed') AS total_revenue,
        (SELECT COUNT(*) FROM abonnements WHERE date_expiration >= NOW()) AS active_subscriptions_bleu,
        (SELECT COUNT(*) FROM abonnements WHERE date_expiration >= NOW() AND formule = 'GOLD') AS active_subscriptions_gold,
        (SELECT COUNT(*) FROM abonnements WHERE date_expiration >= NOW() AND formule = 'PLATINUM') AS active_subscriptions_platinum
    `);

    const [statusRows] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM transactions GROUP BY status'
    );
    const transactionStatus = { success: 0, pending: 0, failed: 0 };
    statusRows.forEach((row) => {
      if (row.status in transactionStatus) transactionStatus[row.status] = parseInt(row.count, 10);
    });

    const [activityRows] = await pool.query(`
      SELECT
        MONTH(created_at) AS month,
        YEAR(created_at)  AS year,
        COUNT(*)          AS count,
        COALESCE(SUM(montant), 0) AS amount
      FROM transactions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY year, month
    `);

    const activityData = activityRows.map((row) => ({
      mois: new Date(2000, row.month - 1, 1).toLocaleString('fr-FR', { month: 'short' }),
      transactions: parseInt(row.count, 10),
      revenue: parseFloat(row.amount),
    }));

    let contactStats = { pending: 0, responded: 0, expired: 0, refunded: 0 };
    try {
      const [[cr]] = await pool.query(`
        SELECT
          SUM(status = 'pending')   AS pending,
          SUM(status = 'responded') AS responded,
          SUM(status = 'expired')   AS expired,
          SUM(status = 'refunded')  AS refunded
        FROM contact_requests`);
      contactStats = {
        pending:   parseInt(cr.pending   || 0),
        responded: parseInt(cr.responded || 0),
        expired:   parseInt(cr.expired   || 0),
        refunded:  parseInt(cr.refunded  || 0),
      };
    } catch {}

    let productPayments = { count: 0, revenue: 0 };
    try {
      const [[pp]] = await pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS revenue FROM product_payments WHERE status = 'paid'`
      );
      productPayments = { count: parseInt(pp.count || 0), revenue: parseFloat(pp.revenue || 0) };
    } catch {}

    let suspendedFarmers = 0;
    try {
      const [[sus]] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE suspended = 1`);
      suspendedFarmers = parseInt(sus.count || 0);
    } catch {}

    res.json({
      users: {
        total: parseInt(stats.total_users, 10),
        farmers: parseInt(stats.total_farmers, 10),
        consumers: parseInt(stats.total_consumers, 10),
      },
      revenue: {
        total: parseFloat(stats.total_revenue),
        growth: 6,
      },
      subscriptions: [
        { formule: 'BLEU',     count: parseInt(stats.active_subscriptions_bleu, 10) },
        { formule: 'GOLD',     count: parseInt(stats.active_subscriptions_gold, 10) },
        { formule: 'PLATINUM', count: parseInt(stats.active_subscriptions_platinum, 10) },
      ],
      transactions: {
        total: transactionStatus.success + transactionStatus.pending + transactionStatus.failed,
        completed: transactionStatus.success,
        pending: transactionStatus.pending,
        failed: transactionStatus.failed,
      },
      activityData,
      contactRequests: contactStats,
      productPayments,
      suspendedFarmers,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      code: 'ADMIN_DASHBOARD_ERROR',
      message: 'Échec de récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    const users = await mysqlUserRepository.listUsers(
      { role, search },
      { page: parseInt(page, 10), limit: parseInt(limit, 10), role, search }
    );
    const total = await mysqlUserRepository.countUsers({ role, search });

    res.json({
      data: users.map(sanitizeUser),
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ code: 'USER_FETCH_ERROR', message: 'Échec de récupération des utilisateurs' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await mysqlUserRepository.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' });
    }
    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ code: 'USER_FETCH_ERROR', message: "Échec de récupération de l'utilisateur" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.motDePasse;
    delete updates.mot_de_passe;
    delete updates.role;

    const pool = getMysqlPool();

    const allowedFields = {
      nom: 'nom',
      email: 'email',
      contact: 'contact',
      fermeNom: 'ferme_nom',
      localisation: 'localisation',
      typeExploitation: 'type_exploitation',
      estActif: 'est_actif',
      isVerified: 'is_verified',
    };

    const setClauses = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(allowedFields, key)) {
        setClauses.push(`${allowedFields[key]} = ?`);
        values.push(value);
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
    }

    values.push(id);
    const [result] = await pool.query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    if (!result.affectedRows) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' });
    }

    const user = await mysqlUserRepository.findUserById(id);
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ code: 'USER_UPDATE_ERROR', message: "Échec de mise à jour de l'utilisateur" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['agriculteur', 'consommateur', 'admin'].includes(role)) {
      return res.status(400).json({ code: 'INVALID_ROLE', message: 'Rôle invalide' });
    }

    const pool = getMysqlPool();
    const [result] = await pool.query(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' });
    }

    const user = await mysqlUserRepository.findUserById(id);
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ code: 'ROLE_UPDATE_ERROR', message: 'Échec de mise à jour du rôle' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const deleted = await mysqlUserRepository.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' });
    }
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ code: 'USER_DELETE_ERROR', message: "Échec de suppression de l'utilisateur" });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await mysqlTransactionRepository.getUserTransactions(id);
    const abonnements = await mysqlAbonnementRepository.getUserAbonnements(id);

    res.json({
      transactions: transactions.transactions,
      abonnements,
    });
  } catch (error) {
    res.status(500).json({ code: 'USER_ACTIVITY_ERROR', message: "Échec de récupération des activités" });
  }
};

const getTransactions = async (req, res) => {
  try {
    const pool = getMysqlPool();
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];
    if (status) { conditions.push('t.status = ?'); values.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[countRow], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM transactions t ${where}`, values),
      pool.query(
        `SELECT t.id, t.reference, t.montant, t.devise, t.methode,
                t.status, t.description, t.created_at,
                u.nom AS user_nom, u.email AS user_email
         FROM transactions t
         LEFT JOIN users u ON u.id = t.user_id
         ${where}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...values, limitNum, offset]
      ),
    ]);

    const total = parseInt(countRow.total, 10);
    const transactions = rows.map(r => ({
      id: r.id,
      reference: r.reference || r.id,
      montant: Number(r.montant),
      devise: r.devise || 'XOF',
      methode: r.methode || '—',
      statut: r.status,
      description: r.description || '',
      createdAt: r.created_at,
      userNom: r.user_nom || 'Visiteur',
      userEmail: r.user_email || '—',
    }));

    res.json({
      data: transactions,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), totalItems: total },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ code: 'TRANSACTION_FETCH_ERROR', message: 'Échec de récupération des transactions' });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const pool = getMysqlPool();
    const { status, page = 1, limit = 20 } = req.query;

    let query = 'SELECT * FROM abonnements WHERE 1 = 1';
    const values = [];

    if (status === 'active') {
      query += ' AND date_expiration >= NOW()';
    } else if (status === 'expired') {
      query += ' AND date_expiration < NOW()';
    } else if (status === 'pending') {
      query += ' AND status = ?';
      values.push('pending');
    }

    query += ' ORDER BY date_debut DESC LIMIT ? OFFSET ?';
    values.push(parseInt(limit, 10), (page - 1) * parseInt(limit, 10));

    const [[totalRow], [rows]] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM abonnements'),
      pool.query(query, values),
    ]);

    const total = parseInt(totalRow.total, 10);

    res.json({
      data: rows,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    res.status(500).json({ code: 'SUBSCRIPTION_FETCH_ERROR', message: 'Échec de récupération des abonnements' });
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
};
