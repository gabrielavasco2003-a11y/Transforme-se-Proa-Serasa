// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // --- Dados básicos ---
  nome: {
    type: String,
    required: true,
    trim: true
  },
  usuario: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  telefone: {
    type: String,
    trim: true,
    default: ''
  },
  nascimento: {
    type: Date
  },

  // --- Senha (só existe se cadastrou por formulário) ---
  senha: {
    type: String,
    select: false // não vem por padrão nas consultas
  },

  // --- Dica de senha ---
  perguntaSenha: {
    type: String,
    trim: true,
    default: ''
  },

  // --- Google OAuth ---
  googleId: {
    type: String,
    default: null
  },
  // true quando o usuário entrou pelo Google e ainda não completou o perfil
  precisaCompletarPerfil: {
    type: Boolean,
    default: false
  },

  // --- Checkboxes do cadastro ---
  termos:       { type: Boolean, default: false },
  regras:       { type: Boolean, default: false },
  marketing:    { type: Boolean, default: false },

  // --- Recuperação de senha ---
  resetToken:        { type: String, default: null },
  resetTokenExpira:  { type: Date,   default: null },

  // --- Controle ---
  criadoEm: { type: Date, default: Date.now }
});

// =========================================================
// HOOK: antes de salvar, faz hash da senha (se ela mudou)
// =========================================================
userSchema.pre('save', async function (next) {
  // só faz hash se a senha foi modificada (ou é nova)
  if (!this.isModified('senha')) return next();

  // se não tem senha (login só Google), pula
  if (!this.senha) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// =========================================================
// MÉTODO: comparar senha digitada com a do banco
// =========================================================
userSchema.methods.compararSenha = async function (senhaDigitada) {
  // se o usuário não tem senha (só Google), retorna false
  if (!this.senha) return false;
  return bcrypt.compare(senhaDigitada, this.senha);
};

module.exports = mongoose.model('User', userSchema);