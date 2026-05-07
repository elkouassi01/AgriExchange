require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getMysqlPool } = require('../config/mysql');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const SELLER = {
  nom: 'Ferme Kouassi',
  email: 'ferme.kouassi@test.com',
  motDePasse: 'test1234',
  contact: '+2250700000001',
  role: 'agriculteur',
  ferme_nom: 'Ferme Kouassi Bio',
  localisation: 'Abidjan, Côte d\'Ivoire',
  type_exploitation: 'maraîchage',
};

const PRODUCTS = [
  {
    nom: 'Tomates fraîches',
    prix: 500,
    description: 'Tomates cultivées sans pesticides, récoltées à maturité.',
    categorie: 'légumes',
    stock: 100,
    unite: 'kg',
    dateRecolte: '2026-04-20',
    etat: 'frais',
    tags: ['bio', 'local', 'sans pesticides'],
    imageUrl: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600',
  },
  {
    nom: 'Ignames blanches',
    prix: 800,
    description: 'Ignames blanches de qualité supérieure, idéales pour le foutou.',
    categorie: 'tubercules',
    stock: 200,
    unite: 'kg',
    dateRecolte: '2026-04-15',
    etat: 'frais',
    tags: ['local', 'traditionnel'],
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600',
  },
  {
    nom: 'Bananes plantain',
    prix: 350,
    description: 'Bananes plantain mûres à point, parfaites pour l\'alloco.',
    categorie: 'fruits',
    stock: 150,
    unite: 'régime',
    dateRecolte: '2026-04-22',
    etat: 'frais',
    tags: ['alloco', 'plantain'],
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600',
  },
  {
    nom: 'Gombo frais',
    prix: 300,
    description: 'Gombo frais récolté du matin, idéal pour les sauces.',
    categorie: 'légumes',
    stock: 80,
    unite: 'kg',
    dateRecolte: '2026-04-24',
    etat: 'frais',
    tags: ['sauce', 'local'],
    imageUrl: 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=600',
  },
  {
    nom: 'Aubergines africaines',
    prix: 400,
    description: 'Aubergines africaines (petites), fraîches et fermes.',
    categorie: 'légumes',
    stock: 60,
    unite: 'kg',
    dateRecolte: '2026-04-23',
    etat: 'frais',
    tags: ['bio', 'local'],
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600',
  },
  {
    nom: 'Maïs grain séché',
    prix: 250,
    description: 'Maïs grain séché, idéal pour la farine ou la consommation directe.',
    categorie: 'céréales',
    stock: 500,
    unite: 'kg',
    dateRecolte: '2026-03-10',
    etat: 'séché',
    tags: ['farine', 'céréale'],
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600',
  },
];

async function seed() {
  const pool = getMysqlPool();
  console.log('Connexion MySQL OK');

  // 1. Trouver ou créer un agriculteur test
  let [rows] = await pool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [SELLER.email]
  );

  let sellerId;
  if (rows.length > 0) {
    sellerId = rows[0].id;
    console.log(`Agriculteur existant : ${sellerId}`);
  } else {
    sellerId = randomUUID();
    const hash = await bcrypt.hash(SELLER.motDePasse, 10);
    await pool.query(
      `INSERT INTO users (id, nom, email, mot_de_passe, contact, role, ferme_nom, localisation, type_exploitation, is_verified, est_actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [sellerId, SELLER.nom, SELLER.email, hash, SELLER.contact, SELLER.role,
       SELLER.ferme_nom, SELLER.localisation, SELLER.type_exploitation]
    );
    console.log(`Agriculteur créé : ${sellerId}`);
  }

  // 2. Supprimer les produits test existants pour cet agriculteur
  const [delResult] = await pool.query(
    'DELETE FROM products WHERE seller_id = ?',
    [sellerId]
  );
  if (delResult.affectedRows > 0) {
    console.log(`${delResult.affectedRows} produit(s) existant(s) supprimé(s)`);
  }

  // 3. Insérer les produits test
  for (const p of PRODUCTS) {
    const productId = randomUUID();
    await pool.query(
      `INSERT INTO products (id, seller_id, nom, prix, description, image_url, categorie, stock, unite, date_recolte, etat, tags, certifications)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId, sellerId, p.nom, p.prix, p.description, p.imageUrl,
        p.categorie, p.stock, p.unite, p.dateRecolte, p.etat,
        JSON.stringify(p.tags || []), JSON.stringify([]),
      ]
    );
    console.log(`  + ${p.nom} (${productId})`);
  }

  console.log('\nTerminé ! 6 produits insérés.');
  console.log(`\nCompte vendeur test :`);
  console.log(`  Email    : ${SELLER.email}`);
  console.log(`  Password : ${SELLER.motDePasse}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
