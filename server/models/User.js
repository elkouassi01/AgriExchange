const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: [true, 'Le nom est obligatoire'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'L\'email est obligatoire'], 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez entrer un email valide']
  },
  motDePasse: { 
    type: String, 
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas retourner le mot de passe par défaut dans les requêtes
  },
  role: { 
    type: String, 
    enum: {
      values: ['agriculteur', 'consommateur'],
      message: 'Le rôle doit être soit "agriculteur" soit "consommateur"'
    }, 
    required: [true, 'Le rôle est obligatoire'] 
  },
  dateCreation: {
    type: Date,
    default: Date.now
  }
});

// Hachage du mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Vérifier mot de passe
userSchema.methods.verifierMotDePasse = async function (motDePasse) {
  try {
    return await bcrypt.compare(motDePasse, this.motDePasse);
  } catch (err) {
    throw err;
  }
};

module.exports = mongoose.model('User', userSchema);