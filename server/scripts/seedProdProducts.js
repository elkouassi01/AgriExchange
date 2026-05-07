/**
 * Seed production — Compte VivriMarket officiel + produits par défaut
 * Usage : node server/scripts/seedProdProducts.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getMysqlPool } = require('../config/mysql');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const VIVRI_ACCOUNT = {
  nom: 'VivriMarket',
  email: 'vendeur@vivrimarket.com',
  motDePasse: 'Vivri@2026!',
  contact: '+2250700000099',
  role: 'agriculteur',
  ferme_nom: 'VivriMarket Officiel',
  localisation: 'Abidjan, Côte d\'Ivoire',
  type_exploitation: 'multi-cultures',
};

const PRODUITS = [
  {
    nom: 'Cacao en fèves',
    prix: 1200,
    description: 'Fèves de cacao séchées de première qualité, produites en Côte d\'Ivoire. Idéales pour la transformation artisanale ou industrielle.',
    categorie: 'cultures de rente',
    stock: 500,
    unite: 'kg',
    dateRecolte: '2026-03-15',
    etat: 'séché',
    tags: ['cacao', 'export', 'bio', 'côte d\'ivoire'],
    imageUrl: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800',
  },
  {
    nom: 'Café Robusta',
    prix: 1500,
    description: 'Café Robusta ivoirien en grains verts, récolté à maturité. Arôme intense et fort taux de caféine.',
    categorie: 'cultures de rente',
    stock: 300,
    unite: 'kg',
    dateRecolte: '2026-02-10',
    etat: 'séché',
    tags: ['café', 'robusta', 'grains', 'local'],
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800',
  },
  {
    nom: 'Ananas Victoria',
    prix: 400,
    description: 'Ananas Victoria juteux et sucrés, cueillis à maturité optimale. Cultivés sans intrants chimiques.',
    categorie: 'fruits',
    stock: 200,
    unite: 'pièce',
    dateRecolte: '2026-04-20',
    etat: 'frais',
    tags: ['ananas', 'victoria', 'tropical', 'sans pesticides'],
    imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800',
  },
  {
    nom: 'Bananes plantain',
    prix: 350,
    description: 'Bananes plantain mûres, parfaites pour l\'alloco, le foutou ou la friture. Régimes de 8 à 12 doigts.',
    categorie: 'fruits',
    stock: 150,
    unite: 'régime',
    dateRecolte: '2026-04-22',
    etat: 'frais',
    tags: ['plantain', 'alloco', 'foutou'],
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800',
  },
  {
    nom: 'Ignames blanches',
    prix: 750,
    description: 'Ignames blanches de variété locale, chair ferme et farineuse. Récoltées dans la région du Gbêkê.',
    categorie: 'tubercules',
    stock: 400,
    unite: 'kg',
    dateRecolte: '2026-04-01',
    etat: 'frais',
    tags: ['igname', 'foutou', 'nord', 'traditionnel'],
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800',
  },
  {
    nom: 'Manioc frais',
    prix: 200,
    description: 'Tubercules de manioc frais, idéaux pour l\'attiéké, le placali ou la consommation bouillie.',
    categorie: 'tubercules',
    stock: 600,
    unite: 'kg',
    dateRecolte: '2026-04-18',
    etat: 'frais',
    tags: ['manioc', 'attiéké', 'placali'],
    imageUrl: 'https://images.unsplash.com/photo-1593010218800-eb41f5e2a20c?w=800',
  },
  {
    nom: 'Tomates fraîches',
    prix: 500,
    description: 'Tomates rondes cultivées en plein champ, sans pesticides. Mûres à point, sucrées et charnues.',
    categorie: 'légumes',
    stock: 120,
    unite: 'kg',
    dateRecolte: '2026-04-24',
    etat: 'frais',
    tags: ['tomates', 'bio', 'sans pesticides', 'maraîchage'],
    imageUrl: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800',
  },
  {
    nom: 'Gombo frais',
    prix: 300,
    description: 'Gombo vert frais récolté du matin, idéal pour les sauces ivoiriennes et africaines.',
    categorie: 'légumes',
    stock: 80,
    unite: 'kg',
    dateRecolte: '2026-04-25',
    etat: 'frais',
    tags: ['gombo', 'sauce', 'maraîchage'],
    imageUrl: 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=800',
  },
  {
    nom: 'Piment rouge fort',
    prix: 450,
    description: 'Piments rouges forts séchés ou frais, cultivés localement. Indispensable dans la cuisine ivoirienne.',
    categorie: 'légumes',
    stock: 60,
    unite: 'kg',
    dateRecolte: '2026-04-10',
    etat: 'frais',
    tags: ['piment', 'épice', 'local'],
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800',
  },
  {
    nom: 'Arachides décortiquées',
    prix: 650,
    description: 'Arachides locales décortiquées, grillées ou crues disponibles. Excellentes pour la sauce arachide.',
    categorie: 'légumineuses',
    stock: 250,
    unite: 'kg',
    dateRecolte: '2026-03-20',
    etat: 'séché',
    tags: ['arachide', 'sauce', 'grillé'],
    imageUrl: 'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=800',
  },
  {
    nom: 'Maïs grain blanc',
    prix: 220,
    description: 'Maïs grain blanc séché, idéal pour la farine de maïs, la bouillie ou l\'alimentation animale.',
    categorie: 'céréales',
    stock: 800,
    unite: 'kg',
    dateRecolte: '2026-03-05',
    etat: 'séché',
    tags: ['maïs', 'farine', 'céréale'],
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800',
  },
  {
    nom: 'Aubergines africaines',
    prix: 380,
    description: 'Petites aubergines africaines (scarlet eggplant), fermes et savoureuses. Cultivées sans intrants.',
    categorie: 'légumes',
    stock: 90,
    unite: 'kg',
    dateRecolte: '2026-04-23',
    etat: 'frais',
    tags: ['aubergine', 'africaine', 'maraîchage'],
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800',
  },
];

async function seed() {
  const pool = getMysqlPool();
  console.log('Connexion MySQL OK\n');

  // 1. Trouver ou créer le compte VivriMarket
  let [rows] = await pool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [VIVRI_ACCOUNT.email]
  );

  let sellerId;
  if (rows.length > 0) {
    sellerId = rows[0].id;
    console.log(`Compte VivriMarket existant : ${sellerId}`);
  } else {
    sellerId = randomUUID();
    const hash = await bcrypt.hash(VIVRI_ACCOUNT.motDePasse, 10);
    await pool.query(
      `INSERT INTO users
         (id, nom, email, mot_de_passe, contact, role, ferme_nom, localisation, type_exploitation, is_verified, est_actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        sellerId,
        VIVRI_ACCOUNT.nom,
        VIVRI_ACCOUNT.email,
        hash,
        VIVRI_ACCOUNT.contact,
        VIVRI_ACCOUNT.role,
        VIVRI_ACCOUNT.ferme_nom,
        VIVRI_ACCOUNT.localisation,
        VIVRI_ACCOUNT.type_exploitation,
      ]
    );
    console.log(`Compte VivriMarket créé : ${sellerId}`);
  }

  // 2. Supprimer les anciens produits de ce compte
  const [del] = await pool.query('DELETE FROM products WHERE seller_id = ?', [sellerId]);
  if (del.affectedRows > 0) {
    console.log(`${del.affectedRows} ancien(s) produit(s) supprimé(s)\n`);
  }

  // 3. Insérer les produits
  console.log('Insertion des produits :');
  for (const p of PRODUITS) {
    const pid = randomUUID();
    await pool.query(
      `INSERT INTO products
         (id, seller_id, nom, prix, description, image_url, categorie, stock, unite,
          date_recolte, etat, tags, certifications)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pid, sellerId, p.nom, p.prix, p.description, p.imageUrl,
        p.categorie, p.stock, p.unite, p.dateRecolte, p.etat,
        JSON.stringify(p.tags || []),
        JSON.stringify([]),
      ]
    );
    console.log(`  ✓ ${p.nom.padEnd(30)} ${p.prix} FCFA/${p.unite}`);
  }

  console.log(`\n${PRODUITS.length} produits insérés avec succès.`);
  console.log('\n── Compte vendeur VivriMarket ──────────────────');
  console.log(`  Email    : ${VIVRI_ACCOUNT.email}`);
  console.log(`  Password : ${VIVRI_ACCOUNT.motDePasse}`);
  console.log('────────────────────────────────────────────────\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
