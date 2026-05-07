const { getPostgresPool } = require('../config/postgres');

const SORTABLE_COLUMNS = {
  createdAt: 'p.created_at',
  prix: 'p.prix',
  nom: 'p.nom',
  stock: 'p.stock',
  dateRecolte: 'p.date_recolte',
};

const normalizeProductRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    _id: row.id,
    nom: row.nom,
    prix: Number(row.prix),
    description: row.description || '',
    imageUrl: row.image_url,
    images: row.images || [],
    categorie: row.categorie,
    stock: row.stock,
    unite: row.unite,
    sellerId: row.seller_id,
    dateRecolte: row.date_recolte,
    mensurations: row.mensurations || '',
    etat: row.etat,
    tags: row.tags || [],
    certifications: row.certifications || [],
    isFeatured: row.is_featured,
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
          rating: row.seller_rating ? Number(row.seller_rating) : 0,
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
    COALESCE(
      (
        SELECT array_agg(pi.url ORDER BY pi.created_at)
        FROM product_images pi
        WHERE pi.product_id = p.id
      ),
      ARRAY[]::TEXT[]
    ) AS images,
    u.nom AS seller_nom,
    u.email AS seller_email,
    u.contact AS seller_contact,
    u.ferme_nom AS seller_ferme_nom,
    u.localisation AS seller_localisation,
    u.type_exploitation AS seller_type_exploitation,
    0 AS seller_rating
  FROM products p
  JOIN users u ON u.id = p.seller_id
`;

const buildFilters = (params, values, options = {}) => {
  const clauses = [];

  if (options.onlyInStock) {
    clauses.push('p.stock > 0');
  }

  if (params.categorie) {
    values.push(String(params.categorie).toLowerCase());
    clauses.push(`LOWER(p.categorie) = $${values.length}`);
  }

  if (params.etat) {
    values.push(String(params.etat).toLowerCase());
    clauses.push(`LOWER(p.etat) = $${values.length}`);
  }

  if (params.minPrix) {
    values.push(Number(params.minPrix));
    clauses.push(`p.prix >= $${values.length}`);
  }

  if (params.maxPrix) {
    values.push(Number(params.maxPrix));
    clauses.push(`p.prix <= $${values.length}`);
  }

  if (params.search && String(params.search).trim()) {
    const searchTerm = `%${String(params.search).trim()}%`;
    values.push(searchTerm);
    clauses.push(`(
      p.nom ILIKE $${values.length}
      OR p.description ILIKE $${values.length}
      OR EXISTS (
        SELECT 1
        FROM unnest(p.tags) AS tag
        WHERE tag ILIKE $${values.length}
      )
    )`);
  }

  if (params.sellerId) {
    values.push(params.sellerId);
    clauses.push(`p.seller_id = $${values.length}`);
  }

  return clauses;
};

const listProducts = async (params = {}, options = {}) => {
  const pool = getPostgresPool();
  const values = [];
  const whereClauses = buildFilters(params, values, options);
  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const page = Math.max(parseInt(params.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 50);
  const offset = (page - 1) * limit;

  const sortColumn = SORTABLE_COLUMNS[params.sortBy] || SORTABLE_COLUMNS.createdAt;
  const sortDirection = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countQuery = `SELECT COUNT(*)::int AS total FROM products p ${whereSql}`;
  const listQuery = `
    ${baseSelect}
    ${whereSql}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const countPromise = pool.query(countQuery, values);
  const listPromise = pool.query(listQuery, [...values, limit, offset]);

  const [countResult, listResult] = await Promise.all([countPromise, listPromise]);
  const total = countResult.rows[0]?.total || 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    docs: listResult.rows.map(normalizeProductRow),
    page,
    totalPages,
    totalDocs: total,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    limit,
  };
};

const findProductById = async (id) => {
  const pool = getPostgresPool();
  const query = `${baseSelect} WHERE p.id = $1 LIMIT 1`;
  const { rows } = await pool.query(query, [id]);
  return normalizeProductRow(rows[0]);
};

const createProduct = async (payload) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const insertQuery = `
      INSERT INTO products (
        seller_id, nom, prix, description, image_url, categorie, stock, unite,
        date_recolte, mensurations, etat, tags, certifications
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13
      )
      RETURNING id
    `;

    const insertValues = [
      payload.sellerId,
      payload.nom,
      payload.prix,
      payload.description || '',
      payload.imageUrl,
      payload.categorie,
      payload.stock,
      payload.unite,
      payload.dateRecolte,
      payload.mensurations || '',
      payload.etat,
      payload.tags || [],
      payload.certifications || [],
    ];

    const insertResult = await client.query(insertQuery, insertValues);
    const productId = insertResult.rows[0].id;

    const images = parseArrayParam(payload.images);
    for (const image of images) {
      await client.query(
        'INSERT INTO product_images (product_id, url) VALUES ($1, $2)',
        [productId, image]
      );
    }

    await client.query('COMMIT');
    return findProductById(productId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateProduct = async (id, sellerId, updates) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

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
    await client.query('BEGIN');

    const setClauses = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (!Object.prototype.hasOwnProperty.call(allowedColumns, key)) {
        return;
      }
      values.push(value);
      setClauses.push(`${allowedColumns[key]} = $${values.length}`);
    });

    if (setClauses.length) {
      values.push(id);
      values.push(sellerId);
      const result = await client.query(
        `
          UPDATE products
          SET ${setClauses.join(', ')}, updated_at = NOW()
          WHERE id = $${values.length - 1} AND seller_id = $${values.length}
          RETURNING id
        `,
        values
      );

      if (!result.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
    } else {
      const existing = await client.query(
        'SELECT id FROM products WHERE id = $1 AND seller_id = $2 LIMIT 1',
        [id, sellerId]
      );
      if (!existing.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'images')) {
      await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      const images = parseArrayParam(updates.images);
      for (const image of images) {
        await client.query(
          'INSERT INTO product_images (product_id, url) VALUES ($1, $2)',
          [id, image]
        );
      }
    }

    await client.query('COMMIT');
    return findProductById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteProduct = async (id, sellerId) => {
  const pool = getPostgresPool();
  const { rowCount } = await pool.query(
    'DELETE FROM products WHERE id = $1 AND seller_id = $2',
    [id, sellerId]
  );
  return rowCount > 0;
};

module.exports = {
  createProduct,
  deleteProduct,
  findProductById,
  listProducts,
  parseArrayParam,
  updateProduct,
};
