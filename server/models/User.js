const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    telephone: { type: String, required: true, unique: true },
    motDePasse: { type: String, required: true },
    role: {
      type: String,
      enum: ["consommateur", "agriculteur", "admin"],
      default: "consommateur",
    },

    // Champs OTP
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    isVerified: { type: Boolean, default: false },

    // Champs abonnement (facultatif)
    abonnement: {
      type: String,
      enum: ["BLEU", "GOLD", "PLATINUM", "OFFRE_GRATUITE", null],
      default: null,
    },
    dateAbonnement: { type: Date },
    dateExpiration: { type: Date },
  },
  { timestamps: true }
);

//
// 🔒 Hash du mot de passe avant sauvegarde
//
userSchema.pre("save", async function (next) {
  if (!this.isModified("motDePasse")) return next();
  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
  next();
});

//
// 🔑 Comparaison du mot de passe
//
userSchema.methods.comparePassword = async function (motDePasseEntrant) {
  return await bcrypt.compare(motDePasseEntrant, this.motDePasse);
};

//
// 🔐 Génération du token JWT
//
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "1h" }
  );
};

//
// 📱 Génération OTP pour validation par SMS
//
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = otp;
  this.otpExpiresAt = moment().add(10, "minutes").toDate();
  return otp;
};

//
// ✅ Vérification OTP
//
userSchema.methods.verifyOTP = function (code) {
  const now = moment();
  if (!this.otpCode || !this.otpExpiresAt) return false;
  if (now.isAfter(this.otpExpiresAt)) return false;
  return this.otpCode === code;
};

//
// 🚮 Effacement OTP après validation
//
userSchema.methods.clearOTP = function () {
  this.otpCode = undefined;
  this.otpExpiresAt = undefined;
  this.isVerified = true;
};

module.exports = mongoose.model("User", userSchema);
