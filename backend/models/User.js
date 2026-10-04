// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // --- Dados básicos ---
  nome:       { type: String, required: true, trim: true },
  usuario:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  telefone:   { type: String, trim: true, default: '' },
  nascimento: { type: Date },

  // --- Senha (só existe se cadastrou por formulário) ---
  senha: { type: String, select: false },

  // --- Dica de senha ---
  perguntaSenha: { type: String, trim: true, default: '' },

  // --- Google OAuth ---
  googleId: { type: String, default: null, index: true },
  precisaCompletarPerfil: { type: Boolean, default: false },

  // --- Telefone verificado ---
  telefoneVerificado: { type: Boolean, default: false },

  // --- Avatar ---
  avatar: { type: String, default: '/img/perfil/1.png' },

  // --- Configurações ---
  config: {
    language:   { type: String, default: 'pt-BR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' }
  },

  // --- Estante do usuário (legado) ---
  livros: [{
    volumeId:  String,
    isbn:      String,
    title:     String,
    authors:   [String],
    thumbnail: String,
    addedAt:   { type: Date, default: Date.now },
    status:    { type: String, default: 'quero' }
  }],

  // --- Checkboxes do cadastro ---
  termos:    { type: Boolean, default: false },
  regras:    { type: Boolean, default: false },
  marketing: { type: Boolean, default: false },

  // --- Recuperação de senha (token longo) ---
  resetToken:       { type: String, default: null },
  resetTokenExpira: { type: Date,   default: null }

}, { timestamps: true });

// =========================================================
// HOOK: faz hash da senha antes de salvar (se foi alterada)
// =========================================================
userSchema.pre('save', async function () {
  if (!this.isModified('senha')) return;
  if (!this.senha) return;

  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
});

// =========================================================
// MÉTODO: comparar senha digitada com a do banco
// =========================================================
userSchema.methods.compararSenha = async function (senhaDigitada) {
  if (!this.senha) return false;
  return bcrypt.compare(senhaDigitada, this.senha);
};

// =========================================================
// MÉTODO: gerar token de recuperação de senha
// =========================================================
userSchema.methods.gerarResetToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex'); // 64 caracteres
  this.resetToken = token;
  this.resetTokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  return token;
};

module.exports = mongoose.model('User', userSchema);