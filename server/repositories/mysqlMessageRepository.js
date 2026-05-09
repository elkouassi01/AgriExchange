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

// Liste des conversations d'un utilisateur (une ligne par interlocuteur)
const getConversations = async (userId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT
       other_id,
       u.nom          AS other_nom,
       u.photo        AS other_photo,
       last_msg,
       last_at,
       unread
     FROM (
       SELECT
         CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
         (SELECT contenu FROM messages m2
            WHERE (m2.sender_id = m.sender_id AND m2.receiver_id = m.receiver_id)
               OR (m2.sender_id = m.receiver_id AND m2.receiver_id = m.sender_id)
            ORDER BY m2.created_at DESC LIMIT 1)           AS last_msg,
         MAX(created_at)                                   AS last_at,
         SUM(CASE WHEN receiver_id = ? AND lu = 0 THEN 1 ELSE 0 END) AS unread
       FROM messages m
       WHERE sender_id = ? OR receiver_id = ?
       GROUP BY other_id
     ) t
     JOIN users u ON u.id = t.other_id
     ORDER BY last_at DESC`,
    [userId, userId, userId, userId]
  );
  return rows.map(r => ({
    otherUserId:  r.other_id,
    otherNom:     r.other_nom,
    otherPhoto:   r.other_photo || null,
    lastMessage:  r.last_msg || '',
    lastAt:       r.last_at,
    unread:       Number(r.unread || 0),
  }));
};

// Marquer toute la conversation avec un utilisateur comme lue
const markConversationAsRead = async (userId, otherUserId) => {
  const pool = getMysqlPool();
  await pool.query(
    'UPDATE messages SET lu = 1 WHERE receiver_id = ? AND sender_id = ? AND lu = 0',
    [userId, otherUserId]
  );
};

// Historique sans filtrage produit (pour la page messages)
const getConversationMessages = async (userId, otherUserId) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [userId, otherUserId, otherUserId, userId]
  );
  return rows.map(mapMessageRow);
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
  getConversations,
  markConversationAsRead,
  getConversationMessages,
};
