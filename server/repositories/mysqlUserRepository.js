const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const mapUserRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    nom: row.nom,
    email: row.email,
    motDePasse: row.mot_de_passe,
    contact: row.contact,
    role: row.role,
    fermeNom: row.ferme_nom,
    localisation: row.localisation,
    typeExploitation: row.type_exploitation,
    otp: row.otp,
    otpExpire: row.otp_expire,
    isVerified: Boolean(row.is_verified),
    estActif: Boolean(row.est_actif),
    derniereConnexion: row.derniere_connexion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapSubscriptionRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    formule: row.formule,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    montant: Number(row.montant || 0),
    statut: row.statut,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const findUserByEmail = async (email) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
  return mapUserRow(rows[0]);
};

const findUserByContact = async (contact) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE contact = ? LIMIT 1', [contact]);
  return mapUserRow(rows[0]);
};

const findUserById = async (id) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return mapUserRow(rows[0]);
};

const updateUserLastLogin = async (id) => {
  const pool = getMysqlPool();
  await pool.query('UPDATE users SET derniere_connexion = NOW() WHERE id = ?', [id]);
};

const updateUserOtp = async (id, otp, otpExpire) => {
  const pool = getMysqlPool();
  await pool.query('UPDATE users SET otp = ?, otp_expire = ? WHERE id = ?', [otp, otpExpire, id]);
};

const markUserVerified = async (id) => {
  const pool = getMysqlPool();
  await pool.query(
    'UPDATE users SET is_verified = 1, otp = NULL, otp_expire = NULL WHERE id = ?',
    [id]
  );
};

const getActiveSubscriptionForUser = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT * FROM user_subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return mapSubscriptionRow(rows[0]);
};

const countMonthlyViews = async (userId) => {
  const pool = getMysqlPool();
  const monthKey = new Date().toISOString().slice(0, 7);
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM product_views WHERE user_id = ? AND month_key = ?',
    [userId, monthKey]
  );
  return parseInt(rows[0]?.total || 0, 10);
};

const createProductView = async (userId, productId) => {
  const pool = getMysqlPool();
  const monthKey = new Date().toISOString().slice(0, 7);
  const id = randomUUID();
  await pool.query(
    'INSERT INTO product_views (id, user_id, product_id, month_key) VALUES (?, ?, ?, ?)',
    [id, userId, productId, monthKey]
  );
};

const createUser = async (data) => {
  const pool = getMysqlPool();
  const id = randomUUID();
  await pool.query(
    `INSERT INTO users (
      id, nom, email, mot_de_passe, contact, role,
      ferme_nom, localisation, type_exploitation, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.nom,
      data.email.toLowerCase(),
      data.motDePasse,
      data.contact,
      data.role || 'consommateur',
      data.fermeNom || null,
      data.localisation || null,
      data.typeExploitation || null,
      data.isVerified ? 1 : 0,
    ]
  );
  return findUserById(id);
};

const updateUserSubscription = async (userId, subscriptionData) => {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT id FROM user_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await conn.query(
        `UPDATE user_subscriptions
         SET formule = ?, date_debut = ?, date_fin = ?,
             montant = ?, statut = ?
         WHERE user_id = ?`,
        [
          subscriptionData.formule,
          subscriptionData.dateDebut,
          subscriptionData.dateFin,
          subscriptionData.montant,
          subscriptionData.statut,
          userId,
        ]
      );
    } else {
      const subId = randomUUID();
      await conn.query(
        `INSERT INTO user_subscriptions (id, user_id, formule, date_debut, date_fin, montant, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          subId,
          userId,
          subscriptionData.formule,
          subscriptionData.dateDebut,
          subscriptionData.dateFin,
          subscriptionData.montant,
          subscriptionData.statut,
        ]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const listUsers = async (filters = {}, pagination = {}) => {
  const pool = getMysqlPool();
  const { page = 1, limit = 10, role, search } = pagination;

  let query = 'SELECT * FROM users WHERE 1 = 1';
  const values = [];

  if (role) {
    query += ' AND role = ?';
    values.push(role);
  }

  if (search) {
    query += ' AND (nom LIKE ? OR email LIKE ?)';
    values.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  values.push(limit, (page - 1) * limit);

  const [rows] = await pool.query(query, values);
  return rows.map(mapUserRow);
};

const countUsers = async (filters = {}) => {
  const pool = getMysqlPool();
  let query = 'SELECT COUNT(*) AS total FROM users WHERE 1 = 1';
  const values = [];

  if (filters.role) {
    query += ' AND role = ?';
    values.push(filters.role);
  }

  const [rows] = await pool.query(query, values);
  return parseInt(rows[0].total, 10);
};

const deleteUser = async (id) => {
  const pool = getMysqlPool();
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  findUserByEmail,
  findUserByContact,
  findUserById,
  updateUserLastLogin,
  updateUserOtp,
  markUserVerified,
  getActiveSubscriptionForUser,
  countMonthlyViews,
  createProductView,
  createUser,
  updateUserSubscription,
  listUsers,
  countUsers,
  deleteUser,
};
