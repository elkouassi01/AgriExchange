const bcrypt = require('bcryptjs');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const mysqlTransactionRepository = require('../repositories/mysqlTransactionRepository');
const mysqlAbonnementRepository = require('../repositories/mysqlAbonnementRepository');
const { getMysqlPool } = require('../config/mysql');
const auditLog = require('../repositories/mysqlAuditLogRepository');
const { isWhatsAppReady } = require('../utils/whatsappClient');
const { sendGeneric } = require('../utils/emailService');

const sanitizeUser = (user) => {
  if (!user) return null;
  const { motDePasse, mot_de_passe, ...rest } = user;
  return rest;
};

// Cache memoire 5 minutes pour le dashboard (evite de recalculer a chaque visite)
const dashCache = { data: null, expiresAt: 0 };
const DASH_CACHE_TTL = 5 * 60 * 1000;

const getDashboardStats = async (req, res) => {
  const forceRefresh = req.query.refresh === '1';
  if (!forceRefresh && dashCache.data && Date.now() < dashCache.expiresAt) {
    return res.json(dashCache.data);
  }

  try {
    const pool = getMysqlPool();

    // ── Utilisateurs : totaux + nouveaux ce mois ─────────────────────────
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                                                            AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'agriculteur')                                AS total_farmers,
        (SELECT COUNT(*) FROM users WHERE role = 'consommateur')                               AS total_consumers,
        (SELECT COUNT(*) FROM users WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()))  AS new_users_month,
        (SELECT COUNT(*) FROM users WHERE role = 'agriculteur' AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) AS new_farmers_month,
        (SELECT COUNT(*) FROM users WHERE role = 'consommateur' AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) AS new_consumers_month,
        (SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE status IN ('completed','success'))            AS total_revenue,
        (SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE status IN ('completed','success') AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) AS revenue_month,
        (SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE status IN ('completed','success') AND MONTH(created_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))) AS revenue_last_month,
        (SELECT COUNT(*) FROM abonnements WHERE date_expiration >= NOW() AND formule = 'BLEU')     AS active_subscriptions_bleu,
        (SELECT COUNT(*) FROM abonnements WHERE date_expiration >= NOW() AND formule = 'GOLD')     AS active_subscriptions_gold,
        (SELECT COUNT(*) FROM abonnements WHERE date_expiration >= NOW() AND formule = 'PLATINUM') AS active_subscriptions_platinum
    `);

    // ── Transactions par statut + ce mois ────────────────────────────────
    const [statusRows] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM transactions GROUP BY status'
    );
    const transactionStatus = { success: 0, completed: 0, pending: 0, failed: 0 };
    statusRows.forEach((row) => {
      if (row.status in transactionStatus) transactionStatus[row.status] = parseInt(row.count, 10);
    });
    const txCompleted = transactionStatus.success + transactionStatus.completed;

    const [[txMonth]] = await pool.query(`
      SELECT COUNT(*) AS count FROM transactions
      WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())
    `);

    // ── Activité 6 derniers mois ─────────────────────────────────────────
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

    // ── Produits ─────────────────────────────────────────────────────────
    let products = { total: 0, pending: 0, approved: 0, rejected: 0 };
    try {
      const [[pr]] = await pool.query(`
        SELECT
          COUNT(*)                                 AS total,
          SUM(moderation_status = 'pending')       AS pending,
          SUM(moderation_status = 'approved')      AS approved,
          SUM(moderation_status = 'rejected')      AS rejected
        FROM products WHERE etat = 'disponible'
      `);
      products = {
        total:    parseInt(pr.total    || 0),
        pending:  parseInt(pr.pending  || 0),
        approved: parseInt(pr.approved || 0),
        rejected: parseInt(pr.rejected || 0),
      };
    } catch {}

    // ── Demandes de contact ───────────────────────────────────────────────
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

    // ── Paiements produits ────────────────────────────────────────────────
    let productPayments = { count: 0, revenue: 0 };
    try {
      const [[pp]] = await pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS revenue FROM product_payments WHERE status = 'paid'`
      );
      productPayments = { count: parseInt(pp.count || 0), revenue: parseFloat(pp.revenue || 0) };
    } catch {}

    // ── Agriculteurs suspendus ────────────────────────────────────────────
    let suspendedFarmers = 0;
    try {
      const [[sus]] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE suspended = 1`);
      suspendedFarmers = parseInt(sus.count || 0);
    } catch {}

    // ── Calcul growth revenus (mois en cours vs mois précédent) ──────────
    const revMonth     = parseFloat(stats.revenue_month      || 0);
    const revLastMonth = parseFloat(stats.revenue_last_month || 0);
    const revenueGrowth = revLastMonth > 0
      ? Math.round(((revMonth - revLastMonth) / revLastMonth) * 100)
      : (revMonth > 0 ? 100 : 0);

    const result = {
      users: {
        total:            parseInt(stats.total_users,       10),
        farmers:          parseInt(stats.total_farmers,     10),
        consumers:        parseInt(stats.total_consumers,   10),
        newThisMonth:     parseInt(stats.new_users_month,   10),
        newFarmersMonth:  parseInt(stats.new_farmers_month, 10),
        newConsumersMonth:parseInt(stats.new_consumers_month, 10),
      },
      revenue: {
        total:       parseFloat(stats.total_revenue),
        thisMonth:   revMonth,
        lastMonth:   revLastMonth,
        growth:      revenueGrowth,
      },
      subscriptions: [
        { formule: 'BLEU',     count: parseInt(stats.active_subscriptions_bleu,     10) },
        { formule: 'GOLD',     count: parseInt(stats.active_subscriptions_gold,     10) },
        { formule: 'PLATINUM', count: parseInt(stats.active_subscriptions_platinum, 10) },
      ],
      transactions: {
        total:      transactionStatus.success + transactionStatus.completed + transactionStatus.pending + transactionStatus.failed,
        completed:  txCompleted,
        pending:    transactionStatus.pending,
        failed:     transactionStatus.failed,
        thisMonth:  parseInt(txMonth.count || 0),
      },
      products,
      activityData,
      contactRequests: contactStats,
      productPayments,
      suspendedFarmers,
    };

    dashCache.data = result;
    dashCache.expiresAt = Date.now() + DASH_CACHE_TTL;
    res.json(result);
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
    auditLog.logAction({
      adminId: req.user.id, adminNom: req.user.nom,
      action: 'user.role_change', targetType: 'user', targetId: id,
      targetLabel: user?.nom, details: { newRole: role },
    });
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ code: 'ROLE_UPDATE_ERROR', message: 'Échec de mise à jour du rôle' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const target = await mysqlUserRepository.findUserById(req.params.id);
    const deleted = await mysqlUserRepository.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' });
    }
    auditLog.logAction({
      adminId: req.user.id, adminNom: req.user.nom,
      action: 'user.delete', targetType: 'user', targetId: req.params.id,
      targetLabel: target?.nom, details: { email: target?.email },
    });
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

const getTransactionStats = async (req, res) => {
  try {
    const pool = getMysqlPool();
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COALESCE(SUM(CASE WHEN status='completed' THEN montant ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN status='success'   THEN montant ELSE 0 END), 0) AS revenue_success,
        COUNT(CASE WHEN status IN ('pending')      THEN 1 END)  AS pending_count,
        COALESCE(SUM(CASE WHEN status='pending'    THEN montant ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN status='failed'            THEN 1 END)  AS failed_count,
        COUNT(CASE WHEN status IN ('success','completed') THEN 1 END) AS success_count
      FROM transactions
    `);
    res.json({
      total:          Number(stats.total),
      revenue:        Number(stats.revenue) + Number(stats.revenue_success),
      pendingCount:   Number(stats.pending_count),
      pendingAmount:  Number(stats.pending_amount),
      failedCount:    Number(stats.failed_count),
      successCount:   Number(stats.success_count),
    });
  } catch (error) {
    console.error('Transaction stats error:', error);
    res.status(500).json({ message: 'Erreur stats transactions' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const pool = getMysqlPool();
    const { page = 1, limit = 20, status, search } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];
    if (status) { conditions.push('t.status = ?'); values.push(status); }
    if (search?.trim()) {
      conditions.push('(t.reference LIKE ? OR u.nom LIKE ? OR u.email LIKE ?)');
      const like = `%${search.trim()}%`;
      values.push(like, like, like);
    }

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
    const { status, formule, page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];
    if (status === 'active')         { conditions.push('a.date_expiration >= NOW() AND a.status = ?'); values.push('active'); }
    else if (status === 'expired')   { conditions.push('a.date_expiration < NOW()'); }
    else if (status === 'cancelled') { conditions.push('a.status = ?'); values.push('cancelled'); }
    else if (status === 'pending')   { conditions.push('a.status = ?'); values.push('pending'); }
    else if (status === 'expiring_soon') {
      conditions.push('a.date_expiration >= NOW() AND a.date_expiration <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND a.status = ?');
      values.push('active');
    }
    if (formule) { conditions.push('a.formule = ?'); values.push(formule); }
    if (search?.trim()) {
      conditions.push('(u.nom LIKE ? OR u.email LIKE ?)');
      const like = `%${search.trim()}%`;
      values.push(like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[statsRow], [countRow], [rows]] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                                          AS total,
          SUM(date_expiration >= NOW() AND status = 'active')                              AS active,
          SUM(date_expiration < NOW())                                                      AS expired,
          SUM(status = 'cancelled')                                                         AS cancelled,
          SUM(status = 'pending')                                                           AS pending,
          SUM(date_expiration >= NOW() AND date_expiration <= DATE_ADD(NOW(), INTERVAL 7 DAY) AND status = 'active') AS expiring_soon,
          COALESCE(SUM(montant), 0)                                                         AS total_revenue,
          SUM(formule = 'BLEU')                                                             AS bleu,
          SUM(formule = 'GOLD')                                                             AS gold,
          SUM(formule = 'PLATINUM')                                                         AS platinum
        FROM abonnements`),
      pool.query(`SELECT COUNT(*) AS total FROM abonnements a ${where}`, values),
      pool.query(
        `SELECT a.*, u.nom AS user_nom, u.email AS user_email
         FROM abonnements a
         LEFT JOIN users u ON u.id = a.utilisateur_id
         ${where}
         ORDER BY a.date_debut DESC LIMIT ? OFFSET ?`,
        [...values, limitNum, offset]
      ),
    ]);

    const subscriptions = rows.map(r => ({
      id: r.id,
      formule: r.formule,
      montant: Number(r.montant),
      dateDebut: r.date_debut,
      dateExpiration: r.date_expiration,
      status: r.status,
      isActive: new Date(r.date_expiration) >= new Date() && r.status === 'active',
      transactionId: r.transaction_id,
      createdAt: r.created_at,
      userNom: r.user_nom || 'Inconnu',
      userEmail: r.user_email || '—',
    }));

    res.json({
      data: subscriptions,
      stats: {
        total:        parseInt(statsRow[0].total         || 0),
        active:       parseInt(statsRow[0].active        || 0),
        expired:      parseInt(statsRow[0].expired       || 0),
        cancelled:    parseInt(statsRow[0].cancelled     || 0),
        pending:      parseInt(statsRow[0].pending       || 0),
        expiringSoon: parseInt(statsRow[0].expiring_soon || 0),
        totalRevenue: parseFloat(statsRow[0].total_revenue || 0),
        byFormule: {
          BLEU:     parseInt(statsRow[0].bleu     || 0),
          GOLD:     parseInt(statsRow[0].gold     || 0),
          PLATINUM: parseInt(statsRow[0].platinum || 0),
        },
      },
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(parseInt(countRow[0].total, 10) / limitNum),
        totalItems: parseInt(countRow[0].total, 10),
      },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ code: 'SUBSCRIPTION_FETCH_ERROR', message: 'Échec de récupération des abonnements' });
  }
};

const createAdminUser = async (req, res) => {
  try {
    const { nom, email, motDePasse, contact, role, fermeNom, localisation } = req.body;

    const [existingEmail, existingContact] = await Promise.all([
      mysqlUserRepository.findUserByEmail(email),
      mysqlUserRepository.findUserByContact(contact),
    ]);
    if (existingEmail) return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    if (existingContact) return res.status(409).json({ message: 'Ce contact est déjà utilisé' });

    const hashed = await bcrypt.hash(motDePasse, 10);
    await mysqlUserRepository.createUser({
      nom,
      email,
      motDePasse: hashed,
      contact,
      role: role || 'consommateur',
      fermeNom: role === 'agriculteur' ? fermeNom : null,
      localisation: role === 'agriculteur' ? localisation : null,
      isVerified: true,
    });

    const user = await mysqlUserRepository.findUserByEmail(email);
    auditLog.logAction({
      adminId: req.user.id, adminNom: req.user.nom,
      action: 'user.create', targetType: 'user', targetId: user?.id,
      targetLabel: nom, details: { email, role: role || 'consommateur' },
    });
    res.status(201).json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ message: "Échec de création de l'utilisateur" });
  }
};

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body;
    const pool = getMysqlPool();

    await pool.query(
      'UPDATE users SET suspended = ?, suspended_at = ?, updated_at = NOW() WHERE id = ?',
      [suspended ? 1 : 0, suspended ? new Date() : null, id]
    );

    const user = await mysqlUserRepository.findUserById(id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    auditLog.logAction({
      adminId: req.user.id, adminNom: req.user.nom,
      action: suspended ? 'user.suspend' : 'user.unsuspend',
      targetType: 'user', targetId: id, targetLabel: user.nom,
    });
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ message: 'Échec de suspension' });
  }
};

const getSystemStatus = async (req, res) => {
  const pool = getMysqlPool();

  // MySQL ping
  let mysqlStatus = 'ok';
  let dbCounts = {};
  try {
    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)        AS users,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM abonnements)  AS abonnements,
        (SELECT COUNT(*) FROM products)     AS products
    `);
    dbCounts = counts;
  } catch {
    mysqlStatus = 'error';
  }

  // Email ping (verify transport)
  let emailStatus = 'unknown';
  let emailConfig = {};
  try {
    const nodemailer = require('nodemailer');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.verify();
    emailStatus = 'ok';
    emailConfig = {
      host: process.env.SMTP_HOST || '—',
      from: process.env.EMAIL_FROM || '—',
      user: process.env.SMTP_USER ? process.env.SMTP_USER.slice(0, 4) + '****' : '—',
    };
  } catch {
    emailStatus = 'error';
    emailConfig = {
      host: process.env.SMTP_HOST || '—',
      from: process.env.EMAIL_FROM || '—',
      user: process.env.SMTP_USER ? process.env.SMTP_USER.slice(0, 4) + '****' : '—',
    };
  }

  const memMB = (bytes) => Math.round(bytes / 1024 / 1024);
  const mem = process.memoryUsage();

  res.json({
    mysql: { status: mysqlStatus, counts: dbCounts },
    whatsapp: {
      status: isWhatsAppReady() ? 'ok' : 'disconnected',
      enabled: process.env.WHATSAPP_ENABLED !== 'false',
    },
    email: { status: emailStatus, config: emailConfig },
    server: {
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      env: process.env.NODE_ENV || 'development',
      memory: { rss: memMB(mem.rss), heapUsed: memMB(mem.heapUsed), heapTotal: memMB(mem.heapTotal) },
    },
  });
};

const sendTestNotification = async (req, res) => {
  const admin = req.user;
  const to = admin.email;
  if (!to) return res.status(400).json({ message: 'Email admin introuvable' });

  try {
    await sendGeneric(
      to,
      '✅ Test de notification — VivriMarket Admin',
      `<p>Bonjour <strong>${admin.nom || 'Admin'}</strong>,</p>
       <p>Ceci est un email de test envoyé depuis le panneau d'administration de VivriMarket.</p>
       <p>Si vous recevez cet email, la configuration SMTP est correcte.</p>
       <p style="color:#64748b;font-size:0.85em">Envoyé le ${new Date().toLocaleString('fr-FR')}</p>`
    );
    res.json({ success: true, message: `Email de test envoyé à ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, message: `Échec envoi : ${err.message}` });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, adminId } = req.query;
    const result = await auditLog.getLogs({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      action,
      adminId,
    });
    res.json(result);
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ message: 'Erreur récupération audit logs' });
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
  getTransactionStats,
  getTransactions,
  getSubscriptions,
  createAdminUser,
  suspendUser,
  getAuditLogs,
  getSystemStatus,
  sendTestNotification,
};
