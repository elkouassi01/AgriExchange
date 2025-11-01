# AgriExchange 🌾

Plateforme d'échange de produits agricoles entre agriculteurs et acheteurs.

---

## 📌 Description

AgriExchange est une application web moderne permettant aux agriculteurs de vendre leurs produits frais directement aux acheteurs, sans intermédiaire.

---

## 🚀 Fonctionnalités

- Création de comptes (agriculteur, acheteur)
- Publication d’annonces de produits frais
- Recherche filtrée par catégorie, localisation, prix
- Messagerie en temps réel
- Gestion des commandes et statuts de livraison
- Interface administrateur

---

## 🧪 Stack technique

- **Backend** : Node.js + Express
- **Frontend** : React + Vite
- **Base de données** : MongoDB (via Mongoose)
- **Authentification** : JWT
- **Styling** : TailwindCSS (ou Bootstrap, à adapter)
- **Stockage** : Images via Multer + dossier `uploads/` ou Cloudinary

---

## 📦 Installation

### Prérequis

- Node.js 18+
- MongoDB (local ou cloud via MongoDB Atlas)
- NPM ou Yarn

### Étapes

```bash
# Cloner le projet
git clone https://github.com/elkouassi01/AgriExchange.git
cd AgriExchange

# Installer les dépendances backend
cd backend
npm install
cp .env.example .env
# Remplir MONGO_URI et JWT_SECRET dans .env

# Installer les dépendances frontend
cd ../frontend
npm install

# Lancer le backend
cd ../backend
npm run dev

# Lancer le frontend (dans un autre terminal)
cd ../frontend
npm run dev
