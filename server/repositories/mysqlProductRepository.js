const { randomUUID } = require('crypto');
const { getMysqlPool } = require('../config/mysql');

const SORTABLE_COLUMNS = {
  createdAt: 'p.created_at',
  prix: 'p.prix',
  nom: 'p.nom',
  stock: 'p.stock',
  dateRecolte: 'p.date_recolte',
};

const parseJson = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
};

const normalizeProductRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    nom: row.nom,
    prix: Number(row.prix),
    description: row.description || '',
    imageUrl: row.image_url,
    images: parseJson(row.images),
    categorie: row.categorie,
    stock: row.stock,
    unite: row.unite,
    sellerId: row.seller_id,
    dateRecolte: row.date_recolte,
    mensurations: row.mensurations || '',
    etat: row.etat,
    tags: parseJson(row.tags),
    certifications: parseJson(row.certifications),
    isFeatured: Boolean(row.is_featured),
    rating: Number(row.rating || 0),
    reviewsCount: row.reviews_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendeur: row.seller_id
      ? {
          id: row.seller_id,
          _id: row.seller_id,
          nom: row.seller_nom,
          email: row.seller_email,
          contact: row.seller_contact,
          fermeNom: row.seller_ferme_nom,
          rating: 0,
          adresse: row.seller_localisation,
          description: row.seller_type_exploitation,
        }
      : null,
  };
};

const parseArrayParam = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const baseSelect = `
  SELECT
    p.*,
    (
      SELECT JSON_ARRAYAGG(url)
      FROM product_images
      WHERE product_id = p.id
    ) AS images,
    u.nom           AS seller_nom,
    u.email         AS seller_email,
    u.contact       AS seller_contact,
    u.ferme_nom     AS seller_ferme_nom,
    u.localisation  AS seller_localisation,
    u.type_exploitation AS seller_type_exploitation
  FROM products p
  JOIN users u ON u.id = p.seller_id AND (u.suspended IS NULL OR u.suspended = 0)
`;

const buildFilters = (params, values, options = {}) => {
  const clauses = [];

  if (options.onlyInStock) {
    clauses.push('p.stock > 0');
  }

  if (params.categorie) {
    values.push(String(params.categorie).toLowerCase());
    clauses.push('LOWER(p.categorie) = ?');
  }

  if (params.etat) {
    values.push(String(params.etat).toLowerCase());
    clauses.push('LOWER(p.etat) = ?');
  }

  if (params.minPrix) {
    values.push(Number(params.minPrix));
    clauses.push('p.prix >= ?');
  }

  if (params.maxPrix) {
    values.push(Number(params.maxPrix));
    clauses.push('p.prix <= ?');
  }

  if (params.search && String(params.search).trim()) {
    const term = `%${String(params.search).trim().toLowerCase()}%`;
    values.push(term, term, term);
    clauses.push('(LOWER(p.nom) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(CAST(p.tags AS CHAR)) LIKE ?)');
  }

  if (params.sellerId) {
    values.push(params.sellerId);
    clauses.push('p.seller_id = ?');
  }

  return clauses;
};

const listProducts = async (params = {}, options = {}) => {
  const pool = getMysqlPool();
  const values = [];
  const whereClauses = buildFilters(params, values, options);
  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const page = Math.max(parseInt(params.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 50);
  const offset = (page - 1) * limit;

  const sortColumn = SORTABLE_COLUMNS[params.sortBy] || SORTABLE_COLUMNS.createdAt;
  const sortDirection = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countQuery = `SELECT COUNT(*) AS total FROM products p ${whereSql}`;
  const listQuery = `
    ${baseSelect}
    ${whereSql}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `;

  const [[countRows], [listRows]] = await Promise.all([
    pool.query(countQuery, values),
    pool.query(listQuery, [...values, limit, offset]),
  ]);

  const total = parseInt(countRows[0]?.total || 0, 10);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    docs: listRows.map(normalizeProductRow),
    page,
    totalPages,
    totalDocs: total,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    limit,
  };
};

const findProductById = async (id) => {
  const pool = getMysqlPool();
  const query = `${baseSelect} WHERE p.id = ? LIMIT 1`;
  const [rows] = await pool.query(query, [id]);
  return normalizeProductRow(rows[0]);
};

const createProduct = async (payload) => {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  const productId = randomUUID();

  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO products (
        id, seller_id, nom, prix, description, image_url, categorie, stock, unite,
        date_recolte, mensurations, etat, tags, certifications
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        payload.sellerId,
        payload.nom,
        payload.prix,
        payload.description || '',
        payload.imageUrl || null,
        payload.categorie,
        payload.stock,
        payload.unite,
        payload.dateRecolte,
        payload.mensurations || '',
        payload.etat,
        JSON.stringify(payload.tags || []),
        JSON.stringify(payload.certifications || []),
      ]
    );

    const images = parseArrayParam(payload.images);
    for (const image of images) {
      await conn.query(
        'INSERT INTO product_images (id, product_id, url) VALUES (?, ?, ?)',
        [randomUUID(), productId, image]
      );
    }

    await conn.commit();
    return findProductById(productId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const updateProduct = async (id, sellerId, updates) => {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  const allowedColumns = {
    nom: 'nom',
    prix: 'prix',
    description: 'description',
    categorie: 'categorie',
    stock: 'stock',
    unite: 'unite',
    dateRecolte: 'date_recolte',
    mensurations: 'mensurations',
    etat: 'etat',
    tags: 'tags',
    certifications: 'certifications',
    imageUrl: 'image_url',
  };

  try {
    await conn.beginTransaction();

    const setClauses = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (!Object.prototype.hasOwnProperty.call(allowedColumns, key)) return;
      const dbValue = (key === 'tags' || key === 'certifications')
        ? JSON.stringify(Array.isArray(value) ? value : [])
        : value;
      values.push(dbValue);
      setClauses.push(`${allowedColumns[key]} = ?`);
    });

    if (setClauses.length) {
      values.push(id, sellerId);
      const [result] = await conn.query(
        `UPDATE products SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE id = ? AND seller_id = ?`,
        values
      );
      if (!result.affectedRows) {
        await conn.rollback();
        return null;
      }
    } else {
      const [existing] = await conn.query(
        'SELECT id FROM products WHERE id = ? AND seller_id = ? LIMIT 1',
        [id, sellerId]
      );
      if (!existing.length) {
        await conn.rollback();
        return null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'images')) {
      await conn.query('DELETE FROM product_images WHERE product_id = ?', [id]);
      const images = parseArrayParam(updates.images);
      for (const image of images) {
        await conn.query(
          'INSERT INTO product_images (id, product_id, url) VALUES (?, ?, ?)',
          [randomUUID(), id, image]
        );
      }
    }

    await conn.commit();
    return findProductById(id);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const deleteProduct = async (id, sellerId) => {
  const pool = getMysqlPool();
  const [result] = await pool.query(
    'DELETE FROM products WHERE id = ? AND seller_id = ?',
    [id, sellerId]
  );
  return result.affectedRows > 0;
};

module.exports = {
  createProduct,
  deleteProduct,
  findProductById,
  listProducts,
  parseArrayParam,
  updateProduct,
};
