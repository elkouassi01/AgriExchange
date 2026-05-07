-- AgriExchange - MySQL 8.0+ Schema

CREATE TABLE IF NOT EXISTS users (
  id           CHAR(36)     NOT NULL,
  nom          VARCHAR(50)  NOT NULL,
  email        VARCHAR(255) NOT NULL,
  mot_de_passe TEXT         NOT NULL,
  contact      VARCHAR(30)  NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'consommateur',
  ferme_nom    VARCHAR(120),
  localisation VARCHAR(255),
  type_exploitation VARCHAR(50),
  otp          VARCHAR(10),
  otp_expire   DATETIME,
  is_verified  TINYINT(1)   NOT NULL DEFAULT 0,
  est_actif    TINYINT(1)   NOT NULL DEFAULT 1,
  date_creation DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  derniere_connexion DATETIME,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_contact (contact),
  CONSTRAINT chk_users_role CHECK (role IN ('agriculteur', 'consommateur', 'admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id         CHAR(36)      NOT NULL,
  user_id    CHAR(36)      NOT NULL,
  formule    VARCHAR(20),
  date_debut DATETIME,
  date_fin   DATETIME,
  montant    DECIMAL(12,2) NOT NULL DEFAULT 0,
  statut     VARCHAR(20)   NOT NULL DEFAULT 'inactif',
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_usub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_usub_formule CHECK (formule IS NULL OR formule IN ('BLEU', 'GOLD', 'PLATINUM')),
  CONSTRAINT chk_usub_statut CHECK (statut IN ('actif', 'inactif', 'expire', 'suspendu', 'en_attente'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id            CHAR(36)      NOT NULL,
  seller_id     CHAR(36)      NOT NULL,
  nom           VARCHAR(100)  NOT NULL,
  prix          DECIMAL(12,2) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  categorie     VARCHAR(50)   NOT NULL,
  stock         INT           NOT NULL DEFAULT 0,
  unite         VARCHAR(30)   NOT NULL DEFAULT 'kg',
  date_recolte  DATE          NOT NULL,
  mensurations  VARCHAR(100),
  etat          VARCHAR(50)   NOT NULL DEFAULT 'frais',
  tags          JSON,
  certifications JSON,
  is_featured   TINYINT(1)    NOT NULL DEFAULT 0,
  rating        DECIMAL(3,1)  NOT NULL DEFAULT 0,
  reviews_count INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
  id         CHAR(36)  NOT NULL,
  product_id CHAR(36)  NOT NULL,
  url        TEXT      NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_pimg_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id                CHAR(36)      NOT NULL,
  user_id           CHAR(36),
  type_transaction  VARCHAR(50),
  montant           DECIMAL(12,2) NOT NULL DEFAULT 0,
  devise            VARCHAR(10)   DEFAULT 'XOF',
  status            VARCHAR(30)   NOT NULL DEFAULT 'pending',
  methode           VARCHAR(50),
  service_paiement  VARCHAR(50),
  reference         VARCHAR(120),
  description       TEXT,
  metadata          JSON,
  provider_response JSON,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transactions_reference (reference),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS abonnements (
  id               CHAR(36)      NOT NULL,
  utilisateur_id   CHAR(36)      NOT NULL,
  formule          VARCHAR(20)   NOT NULL,
  montant          DECIMAL(12,2) NOT NULL DEFAULT 0,
  date_debut       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_expiration  DATETIME      NOT NULL,
  status           VARCHAR(30)   NOT NULL DEFAULT 'active',
  transaction_id   CHAR(36),
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_abonnements_user FOREIGN KEY (utilisateur_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_abonnements_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_views (
  id         CHAR(36)    NOT NULL,
  user_id    CHAR(36)    NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  viewed_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  month_key  VARCHAR(7)  NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_pviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fermes (
  id                CHAR(36)      NOT NULL,
  owner_id          CHAR(36)      NOT NULL,
  nom               VARCHAR(120)  NOT NULL,
  description       TEXT,
  localisation      VARCHAR(255),
  superficie        DECIMAL(12,2),
  type_exploitation VARCHAR(50),
  contact_telephone VARCHAR(30),
  contact_email     VARCHAR(255),
  date_debut        DATETIME,
  date_fin          DATETIME,
  accepte_accord    TINYINT(1)    NOT NULL DEFAULT 0,
  statut            VARCHAR(30)   NOT NULL DEFAULT 'en_attente',
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fermes_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id          CHAR(36)  NOT NULL,
  sender_id   CHAR(36)  NOT NULL,
  receiver_id CHAR(36)  NOT NULL,
  product_id  CHAR(36),
  contenu     TEXT      NOT NULL,
  lu          TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_messages_sender   FOREIGN KEY (sender_id)   REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_messages_product  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans_agriculteur (
  id                    CHAR(36)      NOT NULL,
  nom                   VARCHAR(20)   NOT NULL,
  duree                 INT           NOT NULL,
  max_produits          INT           NOT NULL,
  restriction_categorie TINYINT(1)    NOT NULL DEFAULT 0,
  prix                  DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_plans_agri_nom CHECK (nom IN ('BLEU', 'GOLD', 'PLATINUM'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans_consommateur (
  id                CHAR(36)      NOT NULL,
  utilisateur_id    CHAR(36)      NOT NULL,
  forfait           VARCHAR(20)   NOT NULL,
  date_debut        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duree_mois        INT           NOT NULL,
  date_fin          DATETIME,
  acces_vendeurs_max INT          NOT NULL,
  statut            VARCHAR(20)   NOT NULL DEFAULT 'actif',
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_plans_conso_user FOREIGN KEY (utilisateur_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_plans_conso_forfait CHECK (forfait IN ('BLEU', 'GOLD', 'PLATINUM')),
  CONSTRAINT chk_plans_conso_statut  CHECK (statut IN ('actif', 'expiré', 'annulé'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index
CREATE INDEX idx_users_role              ON users(role);
CREATE INDEX idx_products_seller_id      ON products(seller_id);
CREATE INDEX idx_products_categorie      ON products(categorie);
CREATE INDEX idx_transactions_user_id    ON transactions(user_id);
CREATE INDEX idx_abonnements_user_id     ON abonnements(utilisateur_id);
CREATE INDEX idx_pviews_user_product     ON product_views(user_id, product_id);
CREATE INDEX idx_messages_receiver_id    ON messages(receiver_id);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_product_id     ON messages(product_id);
CREATE INDEX idx_plans_agri_nom          ON plans_agriculteur(nom);
CREATE INDEX idx_plans_conso_user        ON plans_consommateur(utilisateur_id);
CREATE INDEX idx_plans_conso_statut      ON plans_consommateur(statut);
