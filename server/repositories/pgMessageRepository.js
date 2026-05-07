const { getPostgresPool } = require('../config/postgres');

const mapMessageRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    produitId: row.product_id,
    sender: row.sender_id,
    receiver: row.receiver_id,
    texte: row.contenu,
    lu: row.lu,
    date: row.created_at,
  };
};

const sendMessage = async (data) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, product_id, contenu) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.senderId, data.receiverId, data.produitId, data.texte]
  );
  return mapMessageRow(rows[0]);
};

const getMessages = async (produitId, userId, autreUserId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `SELECT * FROM messages 
     WHERE product_id = $1 
       AND (
         (sender_id = $2 AND receiver_id = $3) 
         OR (sender_id = $3 AND receiver_id = $2)
       )
     ORDER BY created_at ASC`,
    [produitId, userId, autreUserId]
  );
  return rows.map(mapMessageRow);
};

const markAsRead = async (messageId, userId) => {
  const pool = getPostgresPool();
  const { rowCount } = await pool.query(
    `UPDATE messages SET lu = TRUE 
     WHERE id = $1 AND receiver_id = $2`,
    [messageId, userId]
  );
  return rowCount > 0;
};

const getUnreadCount = async (userId) => {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND lu = FALSE`,
    [userId]
  );
  return rows[0]?.count || 0;
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
};