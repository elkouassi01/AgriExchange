const { getPostgresPool } = require('../config/postgres');

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
    isVerified: row.is_verified,
    estActif: row.est_actif,
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
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  return mapUserRow(rows[0]);
};

const findUserByContact = async (contact) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE contact = $1 LIMIT 1', [contact]);
  return mapUserRow(rows[0]);
};

const findUserById = async (id) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return mapUserRow(rows[0]);
};

const updateUserLastLogin = async (id) => {
  const pool = getPostgresPool();
  await pool.query('UPDATE users SET derniere_connexion = NOW(), updated_at = NOW() WHERE id = $1', [id]);
};

const updateUserOtp = async (id, otp, otpExpire) => {
  const pool = getPostgresPool();
  await pool.query('UPDATE users SET otp = $2, otp_expire = $3, updated_at = NOW() WHERE id = $1', [id, otp, otpExpire]);
};

const markUserVerified = async (id) => {
  const pool = getPostgresPool();
  await pool.query(
    'UPDATE users SET is_verified = TRUE, otp = NULL, otp_expire = NULL, updated_at = NOW() WHERE id = $1',
    [id]
  );
};

const getActiveSubscriptionForUser = async (userId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    'SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return mapSubscriptionRow(rows[0]);
};

const countMonthlyViews = async (userId) => {
  const pool = getPostgresPool();
  const monthKey = new Date().toISOString().slice(0, 7);
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM product_views WHERE user_id = $1 AND month_key = $2',
    [userId, monthKey]
  );
  return rows[0]?.total || 0;
};

const createProductView = async (userId, productId) => {
  const pool = getPostgresPool();
  const monthKey = new Date().toISOString().slice(0, 7);
  await pool.query(
    'INSERT INTO product_views (user_id, product_id, month_key) VALUES ($1, $2, $3)',
    [userId, productId, monthKey]
  );
};

const createUser = async (data) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `INSERT INTO users (
      nom, email, mot_de_passe, contact, role,
      ferme_nom, localisation, type_exploitation, is_verified
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      data.nom,
      data.email.toLowerCase(),
      data.motDePasse,
      data.contact,
      data.role || 'consommateur',
      data.fermeNom,
      data.localisation,
      data.typeExploitation,
      data.isVerified || false,
    ]
  );
  return mapUserRow(rows[0]);
};

const updateUserSubscription = async (userId, subscriptionData) => {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const existing = await client.query(
      'SELECT id FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE user_subscriptions 
         SET formule = $2, date_debut = $3, date_fin = $4, 
             montant = $5, statut = $6, updated_at = NOW()
         WHERE user_id = $1`,
        [
          userId,
          subscriptionData.formule,
          subscriptionData.dateDebut,
          subscriptionData.dateFin,
          subscriptionData.montant,
          subscriptionData.statut,
        ]
      );
    } else {
      await client.query(
        `INSERT INTO user_subscriptions (
          user_id, formule, date_debut, date_fin, montant, statut
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          subscriptionData.formule,
          subscriptionData.dateDebut,
          subscriptionData.dateFin,
          subscriptionData.montant,
          subscriptionData.statut,
        ]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listUsers = async (filters = {}, pagination = {}) => {
  const pool = getPostgresPool();
  const { page = 1, limit = 10, role, search } = pagination;
  
  let query = 'SELECT * FROM users WHERE 1 = 1';
  const values = [];
  let idx = 1;

  if (role) {
    query += ` AND role = $${idx}`;
    values.push(role);
    idx++;
  }

  if (search) {
    query += ` AND (nom ILIKE $${idx} OR email ILIKE $${idx})`;
    values.push(`%${search}%`);
    idx++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  values.push(limit, (page - 1) * limit);

  const { rows } = await pool.query(query, values);
  return rows.map(mapUserRow);
};

const countUsers = async (filters = {}) => {
  const pool = getPostgresPool();
  let query = 'SELECT COUNT(*)::int AS total FROM users WHERE 1 = 1';
  const values = [];
  let idx = 1;

  if (filters.role) {
    query += ` AND role = $${idx}`;
    values.push(filters.role);
    idx++;
  }

  const { rows } = await pool.query(query, values);
  return rows[0].total;
};

const deleteUser = async (id) => {
  const pool = getPostgresPool();
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
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
