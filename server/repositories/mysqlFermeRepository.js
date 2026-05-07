const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const mapFermeRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    nomFerme: row.nom,
    typeExploitation: row.type_exploitation,
    localisation: row.localisation,
    contact: row.contact_telephone ? {
      telephone: row.contact_telephone,
      email: row.contact_email,
    } : null,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    accepteAccord: Boolean(row.accepte_accord),
    statut: row.statut,
    userId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createFerme = async (data) => {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  const id = randomUUID();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO fermes (
        id, owner_id, nom, type_exploitation, localisation,
        superficie, date_debut, date_fin, accepte_accord, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.nomFerme,
        data.typeExploitation || null,
        data.localisation || null,
        data.superficie || null,
        data.dateDebut || new Date(),
        data.dateFin || null,
        data.accepteAccord ? 1 : 0,
        data.statut || 'en_attente',
      ]
    );
    await conn.commit();
    return getFermeById(id);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const getFermeById = async (id) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM fermes WHERE id = ?', [id]);
  return mapFermeRow(rows[0]);
};

const getFermesByUserId = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT * FROM fermes WHERE owner_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(mapFermeRow);
};

const updateFerme = async (id, userId, updates) => {
  const pool = getMysqlPool();
  const allowedFields = ['nom', 'type_exploitation', 'localisation', 'superficie', 'statut'];
  const setClauses = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (setClauses.length === 0) {
    return getFermeById(id);
  }

  values.push(id, userId);
  const [result] = await pool.query(
    `UPDATE fermes SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = ? AND owner_id = ?`,
    values
  );
  if (!result.affectedRows) return null;
  return getFermeById(id);
};

const deleteFerme = async (id, userId) => {
  const pool = getMysqlPool();
  const [result] = await pool.query(
    'DELETE FROM fermes WHERE id = ? AND owner_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
};

module.exports = {
  createFerme,
  getFermeById,
  getFermesByUserId,
  updateFerme,
  deleteFerme,
};
