const { getMysqlPool } = require('../config/mysql');

const logAction = async ({ adminId, adminNom, action, targetType, targetId, targetLabel, details }) => {
  try {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO admin_audit_logs
        (admin_id, admin_nom, action, target_type, target_id, target_label, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        adminNom   || null,
        action,
        targetType || null,
        targetId   || null,
        targetLabel|| null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (e) {
    // Non bloquant — on ne fait pas crasher l'action principale
    console.error('[AuditLog] Erreur enregistrement:', e.message);
  }
};

const getLogs = async ({ page = 1, limit = 20, action, adminId } = {}) => {
  const pool = getMysqlPool();
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];
  if (action)  { conditions.push('action = ?');   values.push(action); }
  if (adminId) { conditions.push('admin_id = ?'); values.push(adminId); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM admin_audit_logs ${where}`,
    values
  );
  const [rows] = await pool.query(
    `SELECT * FROM admin_audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    pagination: {
      currentPage: page,
      totalPages:  Math.ceil(total / limit),
      totalItems:  total,
    },
  };
};

module.exports = { logAction, getLogs };
