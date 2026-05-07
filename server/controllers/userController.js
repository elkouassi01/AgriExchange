const User = require('../models/User');
const ProductView = require('../models/ProductView');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const { isMysql, sanitizeUser, subscriptionQuotas } = require('../utils/authHelpers');

exports.login = async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const user = isMysql()
      ? await mysqlUserRepository.findUserByEmail(email)
      : await User.findOne({ email }).select('+motDePasse');

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable' });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Mot de passe invalide' });
    }

    const userId = user.id || user._id;
    const token = jwt.sign(
      { id: userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (isMysql()) {
      await mysqlUserRepository.updateUserLastLogin(userId);
    } else {
      user.derniereConnexion = new Date();
      await user.save();
    }

    return res.status(200).json({
      message: 'Connexion reussie',
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    console.error('Erreur login :', err);
    return res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
};

exports.getUserForfait = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = isMysql()
      ? await mysqlUserRepository.findUserById(userId)
      : await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    if (user.role !== 'consommateur') {
      return res.status(403).json({ message: 'Acces reserve aux consommateurs' });
    }

    const abonnement = isMysql()
      ? await mysqlUserRepository.getActiveSubscriptionForUser(userId)
      : user.abonnement || {};

    const formule = abonnement?.formule || null;
    const dateFin = abonnement?.dateFin ? new Date(abonnement.dateFin) : null;
    const abonnementActif = abonnement?.statut === 'actif' && dateFin && dateFin > new Date();
    const joursRestants = dateFin ? Math.ceil((dateFin - new Date()) / (1000 * 60 * 60 * 24)) : 0;
    const vuesCeMois = isMysql()
      ? await mysqlUserRepository.countMonthlyViews(userId)
      : abonnement.vuesUtilisees || 0;
    const quotaTotal = formule ? subscriptionQuotas[formule] || 0 : 0;
    const quotaRestant = quotaTotal === Infinity ? Infinity : Math.max(0, quotaTotal - vuesCeMois);

    return res.status(200).json({
      abonnement: {
        formule,
        dateDebut: abonnement?.dateDebut,
        dateFin: abonnement?.dateFin,
        montant: abonnement?.montant,
        statut: abonnement?.statut,
        joursRestants,
        vuesUtilisees: vuesCeMois,
        vuesRestantes: quotaRestant,
        quotaTotal
      },
      abonnementActif
    });
  } catch (err) {
    console.error('Erreur getUserForfait :', err);
    return res.status(500).json({
      message: 'Erreur interne serveur',
      error: err.message
    });
  }
};

exports.enregistrerVueProduit = async (req, res) => {
  try {
    const userId = req.params.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'ID produit manquant' });
    }

    const user = isMysql()
      ? await mysqlUserRepository.findUserById(userId)
      : await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    if (user.role !== 'consommateur') {
      return res.status(403).json({ message: 'Action reservee aux consommateurs' });
    }

    const abonnement = isMysql()
      ? await mysqlUserRepository.getActiveSubscriptionForUser(userId)
      : user.abonnement || {};

    const formule = abonnement?.formule;
    const quotaTotal = formule ? subscriptionQuotas[formule] || 0 : 0;
    const vuesUtilisees = isMysql()
      ? await mysqlUserRepository.countMonthlyViews(userId)
      : abonnement.vuesUtilisees || 0;

    if (quotaTotal !== Infinity && vuesUtilisees >= quotaTotal) {
      return res.status(403).json({
        message: 'Quota mensuel depasse',
        quotaTotal,
        vuesUtilisees
      });
    }

    if (isMysql()) {
      await mysqlUserRepository.createProductView(userId, productId);
    } else {
      const newView = new ProductView({
        userId: user._id,
        productId
      });
      await newView.save();

      user.abonnement.vuesUtilisees = (user.abonnement.vuesUtilisees || 0) + 1;
      user.abonnement.derniereVue = new Date();
      await user.save();
    }

    return res.status(201).json({
      message: 'Vue enregistree avec succes',
      vuesUtilisees: vuesUtilisees + 1
    });
  } catch (err) {
    console.error('Erreur enregistrerVueProduit :', err);
    return res.status(500).json({
      message: 'Erreur interne serveur',
      error: err.message
    });
  }
};

exports.verifierAccesProduit = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = isMysql()
      ? await mysqlUserRepository.findUserById(userId)
      : await User.findById(userId);

    if (!user) {
      return res.status(404).json({ accessGranted: false, message: 'Utilisateur non trouve' });
    }

    if (user.role !== 'consommateur') {
      return res.status(403).json({ accessGranted: false, message: 'Acces reserve aux consommateurs' });
    }

    const abonnement = isMysql()
      ? await mysqlUserRepository.getActiveSubscriptionForUser(userId)
      : user.abonnement || {};
    const dateFin = abonnement?.dateFin ? new Date(abonnement.dateFin) : null;
    const abonnementActif = abonnement?.statut === 'actif' && dateFin && dateFin > new Date();

    if (!abonnementActif) {
      return res.status(403).json({
        accessGranted: false,
        message: 'Abonnement inactif ou expire'
      });
    }

    const quotaTotal = abonnement?.formule ? subscriptionQuotas[abonnement.formule] || 0 : 0;
    const vuesUtilisees = isMysql()
      ? await mysqlUserRepository.countMonthlyViews(userId)
      : abonnement.vuesUtilisees || 0;

    if (quotaTotal !== Infinity && vuesUtilisees >= quotaTotal) {
      return res.status(403).json({
        accessGranted: false,
        message: 'Quota mensuel depasse',
        quotaTotal,
        vuesUtilisees
      });
    }

    return res.status(200).json({
      accessGranted: true,
      vuesRestantes: quotaTotal === Infinity ? 'Illimite' : quotaTotal - vuesUtilisees
    });
  } catch (err) {
    console.error('Erreur verifierAccesProduit :', err);
    return res.status(500).json({
      accessGranted: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
};
