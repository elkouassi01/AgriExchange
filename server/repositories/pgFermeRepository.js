const { getPostgresPool } = require('../config/postgres');

const mapFermeRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    nomFerme: row.nom,
    typeExploitation: row.type_exploitation,
    localisation: row.localisation,
    contact: row.contact ? {
      telephone: row.contact_telephone,
      email: row.contact_email,
    } : null,
    plan: row.plan,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    accepteAccord: row.accepte_accord,
    statut: row.statut,
    userId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const createFerme = async (data) => {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO fermes (
        owner_id, nom, type_exploitation, localisation, 
        superficie, date_debut, date_fin, accepte_accord, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.userId,
        data.nomFerme,
        data.typeExploitation,
        data.localisation,
        data.superficie,
        data.dateDebut || new Date(),
        data.dateFin,
        data.accepteAccord || false,
        data.statut || 'en_attente',
      ]
    );
    await client.query('COMMIT');
    return mapFermeRow(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getFermeById = async (id) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query('SELECT * FROM fermes WHERE id = $1', [id]);
  return mapFermeRow(rows[0]);
};

const getFermesByUserId = async (userId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    'SELECT * FROM fermes WHERE owner_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(mapFermeRow);
};

const updateFerme = async (id, userId, updates) => {
  const pool = getPostgresPool();
  const allowedFields = ['nom', 'type_exploitation', 'localisation', 'superficie', 'statut'];
  const setClauses = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  });

  if (setClauses.length === 0) {
    return getFermeById(id);
  }

  values.push(id);
  values.push(userId);

  const { rows } = await pool.query(
    `UPDATE fermes SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`,
    values
  );
  return mapFermeRow(rows[0]);
};

const deleteFerme = async (id, userId) => {
  const pool = getPostgresPool();
  const { rowCount } = await pool.query(
    'DELETE FROM fermes WHERE id = $1 AND owner_id = $2',
    [id, userId]
  );
  return rowCount > 0;
};

module.exports = {
  createFerme,
  getFermeById,
  getFermesByUserId,
  updateFerme,
  deleteFerme,
};