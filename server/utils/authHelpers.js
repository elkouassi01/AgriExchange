const DATABASE_PROVIDER = (process.env.DATABASE_PROVIDER || 'mysql').toLowerCase();

const isMysql = () => DATABASE_PROVIDER === 'mysql';
const isPostgres = () => DATABASE_PROVIDER === 'postgres';

const subscriptionQuotas = {
  BLEU: 1,
  GOLD: 5,
  PLATINUM: Infinity,
};

const sanitizeUser = (user) => {
  if (!user) return null;

  return {
    id: user.id || user._id,
    _id: user.id || user._id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    contact: user.contact,
    fermeNom: user.fermeNom,
    localisation: user.localisation,
    typeExploitation: user.typeExploitation,
    estActif: user.estActif,
    isVerified: user.isVerified,
    derniereConnexion: user.derniereConnexion,
  };
};

module.exports = {
  DATABASE_PROVIDER,
  isMysql,
  isPostgres,
  sanitizeUser,
  subscriptionQuotas,
};
