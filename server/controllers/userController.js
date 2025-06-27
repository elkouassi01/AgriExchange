const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const moment = require('moment');

/**
 * 🔐 Connexion utilisateur
 * Route: POST /api/v1/users/login
 */
exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  try {
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: "Mot de passe invalide" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { motDePasse, ...userData } = user.toObject();

    return res.status(200).json({
      message: "Connexion réussie",
      user: userData,
      token,
    });
  } catch (err) {
    console.error('❌ Erreur login :', err.message);
    return res.status(500).json({ message: "Erreur serveur lors de la connexion" });
  }
};

/**
 * 🎫 GET /users/:id/forfait
 */
exports.getUserForfait = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user || user.role !== 'consommateur') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const abonnement = user.abonnement || {};
    const formule = abonnement.formule || null;
    const dateFin = abonnement.dateFin ? new Date(abonnement.dateFin) : null;
    const abonnementActif = abonnement.statut === 'actif' && (!dateFin || dateFin > new Date());

    const now = moment();
    const debutMois = now.clone().startOf('month');

    const vuesCeMoisFiltrees = (user.productViews || []).filter((vue) => {
      const date = moment(vue.viewedAt);
      return date.isSameOrAfter(debutMois) && vue.productId;
    });

    const produitsVus = vuesCeMoisFiltrees.map(v => v.productId.toString());
    const produitsVusUniquement = [...new Set(produitsVus)];

    let quotaTotal = 0;
    if (formule === 'BLEU') quotaTotal = 1;
    else if (formule === 'GOLD') quotaTotal = 5;
    else if (formule === 'PLATINUM') quotaTotal = Infinity;

    const quotaRestant = quotaTotal === Infinity
      ? Infinity
      : Math.max(0, quotaTotal - produitsVusUniquement.length);

    return res.status(200).json({
      formule,
      abonnementActif,
      vuesDetails: {
        produitsVus: produitsVusUniquement,
        quotaRestant,
      },
    });
  } catch (err) {
    console.error('❌ Erreur getUserForfait :', err.message);
    return res.status(500).json({ message: 'Erreur interne serveur' });
  }
};

/**
 * 📊 POST /users/:id/consume-view
 */
exports.enregistrerVueProduit = async (req, res) => {
  try {
    const userId = req.params.id;
    const { produitId } = req.body;

    if (!produitId) {
      return res.status(400).json({ message: 'ID produit manquant' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'consommateur') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const now = moment();
    const debutMois = now.clone().startOf('month');

    const vuesCeMoisFiltrees = (user.productViews || []).filter((vue) => {
      const date = moment(vue.viewedAt);
      return date.isSameOrAfter(debutMois) && vue.productId;
    });

    const produitsVus = vuesCeMoisFiltrees.map(v => v.productId.toString());
    const produitDejaVu = produitsVus.includes(produitId.toString());

    if (produitDejaVu) {
      return res.status(200).json({ message: 'Produit déjà vu ce mois-ci' });
    }

    const formule = user.abonnement?.formule || null;
    let quotaTotal = 0;
    if (formule === 'BLEU') quotaTotal = 1;
    else if (formule === 'GOLD') quotaTotal = 5;
    else if (formule === 'PLATINUM') quotaTotal = Infinity;

    const quotaUtilise = produitsVus.length;
    const quotaRestant = quotaTotal === Infinity ? Infinity : quotaTotal - quotaUtilise;

    if (quotaRestant <= 0) {
      return res.status(403).json({ message: 'Quota mensuel dépassé' });
    }

    user.productViews.push({ productId: produitId, viewedAt: new Date() });
    await user.save();

    return res.status(201).json({ message: 'Vue enregistrée avec succès' });
  } catch (err) {
    console.error('❌ Erreur enregistrerVueProduit :', err.message);
    return res.status(500).json({ message: 'Erreur interne serveur' });
  }
};

/**
 * ✅ GET /users/products/:productId/can-access
 */
exports.verifierAccesProduit = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { productId } = req.params;

    if (!user || user.role !== 'consommateur') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const abonnement = user.abonnement || {};
    const dateFin = abonnement.dateFin ? new Date(abonnement.dateFin) : null;
    const abonnementActif = abonnement.statut === 'actif' && (!dateFin || dateFin > new Date());

    if (!abonnementActif) {
      return res.status(403).json({ accessGranted: false, message: 'Abonnement inactif ou expiré' });
    }

    const now = moment();
    const debutMois = now.clone().startOf('month');

    const vuesCeMois = (user.productViews || []).filter((vue) => {
      const date = moment(vue.viewedAt);
      return date.isSameOrAfter(debutMois) && vue.productId;
    });

    const produitsVus = vuesCeMois.map(v => v.productId.toString());
    const dejaVu = produitsVus.includes(productId);

    const formule = abonnement.formule || null;
    let quotaTotal = 0;
    if (formule === 'BLEU') quotaTotal = 1;
    else if (formule === 'GOLD') quotaTotal = 5;
    else if (formule === 'PLATINUM') quotaTotal = Infinity;

    const quotaUtilise = [...new Set(produitsVus)].length;
    const quotaRestant = quotaTotal === Infinity ? Infinity : quotaTotal - quotaUtilise;

    if (dejaVu || quotaRestant > 0) {
      return res.status(200).json({ accessGranted: true });
    }

    return res.status(403).json({ accessGranted: false, message: 'Quota atteint' });
  } catch (err) {
    console.error('❌ Erreur verifierAccesProduit :', err.message);
    return res.status(500).json({ accessGranted: false, message: 'Erreur serveur' });
  }
};
