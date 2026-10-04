// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- Dados básicos ---
  nome:       { type: String, required: true, trim: true },
  usuario:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  telefone:   { type: String, trim: true, default: '' },
  nascimento: { type: Date },

  // --- Senha (só existe se cadastrou por formulário) ---
  senhaHash: { type: String, select: false },

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

  // --- Estante do usuário (legado — migrando pra ShelfItem) ---
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

  // --- Recuperação de senha (token longo — pra usar no futuro) ---
  resetToken:       { type: String, default: null },
  resetTokenExpira: { type: Date,   default: null }

}, { timestamps: true });

// ⚠️ HOOK pre('save') e método compararSenha ficam
//    para a Etapa 4 (quando todas as rotas forem ajustadas).
//    Por enquanto, NÃO adicionar aqui — senão quebra o login atual.

module.exports = mongoose.model('User', userSchema);