const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const mapMessageRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    produitId: row.product_id,
    sender: row.sender_id,
    receiver: row.receiver_id,
    texte: row.contenu,
    lu: Boolean(row.lu),
    date: row.created_at,
  };
};

const sendMessage = async (data) => {
  const pool = getMysqlPool();
  const id = randomUUID();
  await pool.query(
    `INSERT INTO messages (id, sender_id, receiver_id, product_id, contenu)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.senderId, data.receiverId, data.produitId || null, data.texte]
  );
  const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [id]);
  return mapMessageRow(rows[0]);
};

const getMessages = async (produitId, userId, autreUserId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT * FROM messages
     WHERE product_id = ?
       AND (
         (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
       )
     ORDER BY created_at ASC`,
    [produitId, userId, autreUserId, autreUserId, userId]
  );
  return rows.map(mapMessageRow);
};

const markAsRead = async (messageId, userId) => {
  const pool = getMysqlPool();
  const [result] = await pool.query(
    `UPDATE messages SET lu = 1 WHERE id = ? AND receiver_id = ?`,
    [messageId, userId]
  );
  return result.affectedRows > 0;
};

const getUnreadCount = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND lu = 0`,
    [userId]
  );
  return parseInt(rows[0]?.count || 0, 10);
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
};
