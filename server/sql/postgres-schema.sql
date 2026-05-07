CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe TEXT NOT NULL,
  contact VARCHAR(30) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'consommateur',
  ferme_nom VARCHAR(120),
  localisation VARCHAR(255),
  type_exploitation VARCHAR(50),
  otp VARCHAR(10),
  otp_expire TIMESTAMPTZ,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  est_actif BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  derniere_connexion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (role IN ('agriculteur', 'consommateur', 'admin'))
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  formule VARCHAR(20),
  date_debut TIMESTAMPTZ,
  date_fin TIMESTAMPTZ,
  montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
  statut VARCHAR(20) NOT NULL DEFAULT 'inactif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (formule IS NULL OR formule IN ('BLEU', 'GOLD', 'PLATINUM')),
  CHECK (statut IN ('actif', 'inactif', 'expire', 'suspendu', 'en_attente'))
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  prix NUMERIC(12, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  categorie VARCHAR(50) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unite VARCHAR(30) NOT NULL DEFAULT 'kg',
  date_recolte DATE NOT NULL,
  mensurations VARCHAR(100),
  etat VARCHAR(50) NOT NULL DEFAULT 'frais',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  certifications TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3, 1) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  methode VARCHAR(50),
  reference VARCHAR(120) UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  provider_response JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abonnements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  formule VARCHAR(20) NOT NULL,
  montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_expiration TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month_key VARCHAR(7) NOT NULL
);

CREATE TABLE IF NOT EXISTS fermes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(120) NOT NULL,
  description TEXT,
  localisation VARCHAR(255),
  superficie NUMERIC(12, 2),
  type_exploitation VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tables pour les plans (PlanAgriculteur et PlanConsommateur)
CREATE TABLE IF NOT EXISTS plans_agriculteur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(20) NOT NULL CHECK (nom IN ('BLEU', 'GOLD', 'PLATINUM')),
  duree INTEGER NOT NULL,
  max_produits INTEGER NOT NULL,
  restriction_categorie BOOLEAN NOT NULL DEFAULT FALSE,
  prix NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans_consommateur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forfait VARCHAR(20) NOT NULL CHECK (forfait IN ('BLEU', 'GOLD', 'PLATINUM')),
  date_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duree_mois INTEGER NOT NULL,
  date_fin TIMESTAMPTZ,
  acces_vendeurs_max INTEGER NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'expiré', 'annulé')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger pour calculer automatiquement date_fin dans plans_consommateur
CREATE OR REPLACE FUNCTION update_plans_consommateur_date_fin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.duree_mois IS NOT NULL THEN
    NEW.date_fin := (NEW.date_debut + (NEW.duree_mois || ' months')::interval);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_plans_consommateur_date_fin ON plans_consommateur;
CREATE TRIGGER trigger_update_plans_consommateur_date_fin
  BEFORE INSERT OR UPDATE ON plans_consommateur
  FOR EACH ROW EXECUTE FUNCTION update_plans_consommateur_date_fin();

-- Index
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_product_id ON messages(product_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_plans_agriculteur_nom ON plans_agriculteur(nom);
CREATE INDEX IF NOT EXISTS idx_plans_consommateur_utilisateur ON plans_consommateur(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_plans_consommateur_statut ON plans_consommateur(statut);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_categorie ON products(categorie);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_user_id ON abonnements(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_product ON product_views(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
