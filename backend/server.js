require('dotenv').config();   // ← ADICIONADO: carrega .env

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------- RESOLUÇÃO DE CAMINHOS ----------
const ROOT_DIR = process.cwd();
const possibleFrontendPaths = [
  path.resolve(ROOT_DIR, 'frontend'),
  path.resolve(ROOT_DIR, '../frontend'),
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, 'frontend')
];
const FRONTEND_PATH = possibleFrontendPaths.find(p => fs.existsSync(p)) || possibleFrontendPaths[0];
const HTML_PATH = path.join(FRONTEND_PATH, 'html');
const IMG_PATH  = path.resolve(FRONTEND_PATH, '..', 'img');
const DATA_PATH = path.join(FRONTEND_PATH, 'data');

console.log('--- RESOLUÇÃO DE CAMINHOS ---');
console.log('ROOT     :', ROOT_DIR);
console.log('FRONTEND :', FRONTEND_PATH);
console.log('HTML     :', HTML_PATH);
console.log('IMG      :', IMG_PATH);
console.log('DATA     :', DATA_PATH);

// ---------- HEADERS PARA SERVICE WORKER ----------
app.use((req, res, next) => {
  if (req.path.endsWith('/sw.js') || req.path === '/sw.js') {
    res.set('Service-Worker-Allowed', '/');
    res.set('Cache-Control', 'no-cache');
  }
  next();
});

// ---------- ESTÁTICOS ----------
app.use(express.static(FRONTEND_PATH));
if (fs.existsSync(HTML_PATH)) app.use(express.static(HTML_PATH));
if (fs.existsSync(IMG_PATH))  app.use('/img', express.static(IMG_PATH));
if (fs.existsSync(DATA_PATH)) app.use('/data', express.static(DATA_PATH));

// ---------- SERVICE WORKER NA RAIZ ----------
app.get('/sw.js', (req, res) => {
  const swCandidates = [
    path.join(FRONTEND_PATH, 'sw.js'),
    path.join(ROOT_DIR, 'frontend', 'sw.js'),
    path.join(__dirname, 'frontend', 'sw.js'),
    path.join(FRONTEND_PATH, 'js', 'sw.js')
  ];
  for (const p of swCandidates) {
    if (fs.existsSync(p)) {
      res.set('Service-Worker-Allowed', '/');
      res.set('Cache-Control', 'no-cache');
      return res.sendFile(p);
    }
  }
  return res.status(404).type('application/javascript').send('// sw.js não encontrado');
});

// Helper seguro
const sendHtmlFile = (fileName, res) => {
  const candidates = [
    path.join(HTML_PATH, fileName),
    path.resolve(ROOT_DIR, 'frontend/html', fileName),
    path.resolve(__dirname, '../frontend/html', fileName),
    path.join(FRONTEND_PATH, fileName)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  return res.status(404).send(`Página ${fileName} não encontrada.`);
};

// ---------- ROTAS HTML ----------
app.get('/',                  (req, res) => sendHtmlFile('index.html', res));
app.get('/index.html',        (req, res) => sendHtmlFile('index.html', res));
app.get('/login.html',        (req, res) => sendHtmlFile('login.html', res));
app.get('/cadastro.html',     (req, res) => sendHtmlFile('cadastro.html', res));
app.get('/completar.html',    (req, res) => sendHtmlFile('completar.html', res));
app.get('/editar-perfil.html',(req, res) => sendHtmlFile('editar-perfil.html', res));
app.get('/perfil.html',       (req, res) => sendHtmlFile('perfil.html', res));
app.get('/perfil',            (req, res) => sendHtmlFile('perfil.html', res));

app.get('/shelf.html',        (req, res) => sendHtmlFile('shelf.html', res));
app.get('/shelf',             (req, res) => sendHtmlFile('shelf.html', res));

// >>> NOVO: edit-shelf
app.get('/edit-shelf.html',   (req, res) => sendHtmlFile('edit-shelf.html', res));
app.get('/edit-shelf',        (req, res) => sendHtmlFile('edit-shelf.html', res));

// Novas páginas de recuperação / validação
app.get('/recuperar-email.html',  (req, res) => sendHtmlFile('recuperar-email.html', res));
app.get('/recuperar-codigo.html', (req, res) => sendHtmlFile('recuperar-codigo.html', res));
app.get('/recuperar-senha.html',  (req, res) => sendHtmlFile('recuperar-senha.html', res));
app.get('/validar-telefone.html', (req, res) => sendHtmlFile('validar-telefone.html', res));
app.get('/validar-codigo.html',   (req, res) => sendHtmlFile('validar-codigo.html', res));

// ---------- MONGO ----------
const MONGO_URI = process.env.MONGO_URI;

// ---------- SESSÃO ----------
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, collectionName: 'sessions' }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    secure: false,
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro MongoDB:', err));

// ---------- MODELO: USER ----------
const UserSchema = new mongoose.Schema({
  nome: String,
  usuario: String,
  email: { type: String, index: true },
  senhaHash: String,
  telefone: String,
  telefoneVerificado: { type: Boolean, default: false },
  nascimento: Date,
  googleId: String,
  // Mantido por compatibilidade — não é mais usado para leitura
  livros: [{
    volumeId: String,
    isbn: String,
    title: String,
    authors: [String],
    thumbnail: String,
    addedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'quero' }
  }]
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const sanitize = (user) => {
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.senhaHash;
  return u;
};

// ---------- MODELO: SHELF ITEM (NOVO) ----------
const ShelfItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  volumeId: { type: String, required: true, index: true },
  // Dados do livro (snapshot, para não precisar ir no Google toda vez)
  title: String,
  authors: [String],
  thumbnail: String,
  publishedDate: String,
  categories: [String],
  description: String,
  isbn: String,
  // Dados do usuário
  status: { type: String, default: 'quero' }, // quero|lendo|terminei|pausei|desisti
  currentPage: { type: Number, default: null },
  currentChapter: { type: String, default: '' },
  reactions: { type: [String], default: [] },
  userRating: { type: Number, default: null, min: 0, max: 10 },
  addedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Garante que um usuário só tem 1 item por volumeId
ShelfItemSchema.index({ userId: 1, volumeId: 1 }, { unique: true });

const ShelfItem = mongoose.model('ShelfItem', ShelfItemSchema);

// ---------- MODELO: BOOK SNAPSHOT ----------
const BookSnapshotSchema = new mongoose.Schema({
  volumeId: { type: String, unique: true, index: true },
  title: String,
  authors: [String],
  description: String,
  categories: [String],
  industryIdentifiers: [Object],
  thumbnail: String,
  publishedDate: String,
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const BookSnapshot = mongoose.model('BookSnapshot', BookSnapshotSchema);

// ---------- MODELO: COMMENT ----------
const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookVolumeId: { type: String, required: true, index: true },
  text: { type: String, required: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
  editedAt: Date
});
const Comment = mongoose.model('Comment', CommentSchema);

// ---------- MODELO: RECOVERY CODE ----------
const RecoveryCodeSchema = new mongoose.Schema({
  email:    { type: String, index: true },
  codigo:   { type: String, required: true },
  usado:    { type: Boolean, default: false },
  expiresAt:{ type: Date, expires: 0 }
}, { timestamps: true });

const RecoveryCode = mongoose.model('RecoveryCode', RecoveryCodeSchema);

// ---------- MODELO: PHONE VERIFICATION ----------
const PhoneVerificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  telefone: String,
  codigo:   { type: String, required: true },
  usado:    { type: Boolean, default: false },
  expiresAt:{ type: Date, expires: 0 }
}, { timestamps: true });

const PhoneVerification = mongoose.model('PhoneVerification', PhoneVerificationSchema);

// ================================================================
// ============ INTEGRAÇÕES: E-MAIL (Brevo) e SMS (StackVerify) ===
// ================================================================
const BREVO_API_KEY    = process.env.BREVO_API_KEY;
const SMS_API_TOKEN    = process.env.SMS_API_TOKEN;
const EMAIL_FROM       = process.env.EMAIL_FROM;
const EMAIL_FROM_NAME  = process.env.EMAIL_FROM_NAME;

function gerarCodigo5() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

async function enviarEmailCodigo(destino, codigo) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
      to: [{ email: destino }],
      subject: 'Seu código de recuperação — Spoiler Esperado',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
          <h2 style="margin:0 0 12px">Recuperação de Senha</h2>
          <p>Olá! Use o código abaixo para continuar a recuperação da sua senha:</p>
          <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:24px 0;text-align:center">${codigo}</p>
          <p style="color:#666;font-size:13px">Este código expira em <strong>10 minutos</strong>. Se você não solicitou, ignore este e-mail.</p>
        </div>
      `
    })
  });
  if (!resp.ok) {
    const erro = await resp.text();
    console.error('Brevo erro:', resp.status, erro);
    throw new Error('Falha ao enviar e-mail');
  }
}

async function enviarSMSCodigo(telefoneE164, codigo) {
  try {
    const resp = await fetch('https://api.stackverify.com/v1/sms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SMS_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: telefoneE164,
        message: `Spoiler Esperado: seu código é ${codigo}. Expira em 10 minutos.`
      })
    });
    if (!resp.ok) {
      const erro = await resp.text();
      console.error('StackVerify erro:', resp.status, erro);
      throw new Error('Falha ao enviar SMS');
    }
    return true;
  } catch (err) {
    console.error('Erro no envio de SMS:', err);
    console.log(`[SMS-FALLBACK] Código para ${telefoneE164}: ${codigo}`);
    return false;
  }
}

function normalizarTelefone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return '+' + digits;
  return '+55' + digits;
}

// ================================================================
// ============ ROTAS: RECUPERAÇÃO DE SENHA =======================
// ================================================================
app.post('/api/recuperar/enviar-codigo', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ mensagem: 'E-mail obrigatório.' });
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ mensagem: 'E-mail não cadastrado.' });
    const codigo = gerarCodigo5();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await RecoveryCode.deleteMany({ email });
    await RecoveryCode.create({ email, codigo, expiresAt });
    await enviarEmailCodigo(email, codigo);
    return res.json({ mensagem: 'Código enviado para o e-mail.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao enviar código.' });
  }
});

app.post('/api/recuperar/validar-codigo', async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ mensagem: 'Dados incompletos.' });
    const reg = await RecoveryCode.findOne({ email, codigo, usado: false });
    if (!reg) return res.status(400).json({ mensagem: 'Código inválido.' });
    if (reg.expiresAt < new Date()) return res.status(400).json({ mensagem: 'Código expirado.' });
    return res.json({ mensagem: 'Código válido.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao validar código.' });
  }
});

app.post('/api/recuperar/nova-senha', async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;
    if (!email || !codigo || !novaSenha) return res.status(400).json({ mensagem: 'Dados incompletos.' });
    if (novaSenha.length < 6) return res.status(400).json({ mensagem: 'A senha deve ter ao menos 6 caracteres.' });
    const reg = await RecoveryCode.findOne({ email, codigo, usado: false });
    if (!reg) return res.status(400).json({ mensagem: 'Código inválido.' });
    if (reg.expiresAt < new Date()) return res.status(400).json({ mensagem: 'Código expirado.' });
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    usuario.senhaHash = novaSenha;
    await usuario.save();
    reg.usado = true;
    await reg.save();
    req.login(usuario, (err) => {
      if (err) return res.json({ mensagem: 'Senha alterada com sucesso!', usuario: sanitize(usuario) });
      req.session.save(() =>
        res.json({ mensagem: 'Senha alterada com sucesso!', usuario: sanitize(usuario) })
      );
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao alterar senha.' });
  }
});

// ================================================================
// ============ ROTAS: VALIDAÇÃO DE TELEFONE ======================
// ================================================================
app.post('/api/validar-telefone/enviar', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { telefone } = req.body;
    if (!telefone) return res.status(400).json({ mensagem: 'Telefone obrigatório.' });
    const e164 = normalizarTelefone(telefone);
    if (e164.length < 12) return res.status(400).json({ mensagem: 'Telefone inválido.' });
    const codigo = gerarCodigo5();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await PhoneVerification.deleteMany({ userId: req.user._id });
    await PhoneVerification.create({ userId: req.user._id, telefone: e164, codigo, expiresAt });
    const u = await User.findById(req.user._id);
    if (u) { u.telefone = e164; u.telefoneVerificado = false; await u.save(); }
    await enviarSMSCodigo(e164, codigo);
    return res.json({ mensagem: 'Código enviado por SMS.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao enviar SMS.' });
  }
});

app.post('/api/validar-telefone/validar', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ mensagem: 'Código obrigatório.' });
    const reg = await PhoneVerification.findOne({ userId: req.user._id, codigo, usado: false });
    if (!reg) return res.status(400).json({ mensagem: 'Código inválido.' });
    if (reg.expiresAt < new Date()) return res.status(400).json({ mensagem: 'Código expirado.' });
    reg.usado = true;
    await reg.save();
    const u = await User.findById(req.user._id);
    if (u) {
      u.telefoneVerificado = true;
      if (reg.telefone) u.telefone = reg.telefone;
      await u.save();
    }
    return res.json({ mensagem: 'Telefone verificado com sucesso!', usuario: u ? sanitize(u) : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao validar código.' });
  }
});

// ================================================================
// ============ GOOGLE BOOKS: util ================================
// ================================================================
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

async function fetchGoogleBookByVolumeId(volumeId) {
  const url = `${GOOGLE_BOOKS_BASE}/${encodeURIComponent(volumeId)}?key=${GOOGLE_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Erro ao consultar Google Books');
  return resp.json();
}

// ---------- API: CADASTRO ----------
app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, usuario, email, senhaHash, senha, telefone, nascimento } = req.body;
    if (!email) return res.status(400).json({ mensagem: 'E-mail obrigatório.' });
    const existente = await User.findOne({ email });
    if (existente) return res.status(400).json({ mensagem: 'E-mail já cadastrado.' });
    const novo = new User({
      nome, usuario, email,
      senhaHash: senhaHash || senha,
      telefone,
      nascimento: nascimento ? new Date(nascimento) : undefined
    });
    await novo.save();
    req.login(novo, (err) => {
      if (err) return res.json({ mensagem: 'Usuário cadastrado!', usuario: sanitize(novo) });
      req.session.save(() =>
        res.json({ mensagem: 'Usuário cadastrado com sucesso!', usuario: sanitize(novo) })
      );
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao cadastrar usuário.' });
  }
});

// ---------- API: LOGIN ----------
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const usuario = await User.findOne({ email });
    if (!usuario)  return res.status(400).json({ mensagem: 'Usuário não encontrado!' });
    if (usuario.senhaHash !== senha) return res.status(400).json({ mensagem: 'Senha incorreta!' });
    req.login(usuario, (err) => {
      if (err) return res.status(500).json({ mensagem: 'Erro ao iniciar sessão.' });
      req.session.save(() =>
        res.json({ mensagem: 'Login realizado com sucesso!', usuario: sanitize(usuario) })
      );
    });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao realizar login.' });
  }
});

// ---------- API: ME ----------
app.get('/api/me', (req, res) => {
  if (req.user) return res.json(sanitize(req.user));
  res.status(401).json({ mensagem: 'Não autenticado' });
});

// ---------- API: PERFIL por email ----------
app.get('/api/perfil/:email', async (req, res) => {
  try {
    const usuario = await User.findOne({ email: req.params.email });
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado!' });
    res.json(sanitize(usuario));
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar perfil.' });
  }
});

// ---------- API: EXCLUIR ----------
app.delete('/api/excluir', async (req, res) => {
  const { email } = req.body;
  try {
    const usuario = await User.findOneAndDelete({ email });
    if (!usuario) return res.status(400).json({ mensagem: 'Usuário não encontrado!' });
    req.logout(() => {});
    req.session.destroy(() => {});
    res.json({ mensagem: 'Conta excluída com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao excluir conta.' });
  }
});

// ---------- GOOGLE OAUTH ----------
const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${BASE_URL}/api/google/callback`,
  proxy: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    let usuario = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
    if (!usuario) {
      usuario = new User({ nome: profile.displayName, email, googleId: profile.id, livros: [] });
      await usuario.save();
    } else if (!usuario.googleId) {
      usuario.googleId = profile.id;
      await usuario.save();
    }
    return done(null, usuario);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((usuario, done) => done(null, usuario._id.toString()));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); }
  catch (err) { done(err, null); }
});

app.get('/api/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html?erro=google' }),
  (req, res) => {
    req.session.save((err) => {
      if (err) {
        console.error('Erro ao salvar sessão:', err);
        return res.redirect('/login.html?erro=session');
      }
      const u = req.user;
      if (!u.telefone || !u.nascimento || !u.senhaHash) {
        return res.redirect('/completar.html');
      }
      return res.redirect('/perfil');
    });
  }
);

// ---------- API: COMPLETAR CADASTRO ----------
app.post('/api/completar', async (req, res) => {
  const { telefone, nascimento, senhaHash, senha } = req.body;
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado!' });
    const usuario = await User.findById(req.user._id);
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado!' });
    if (telefone)           usuario.telefone = telefone;
    if (nascimento)         usuario.nascimento = new Date(nascimento);
    if (senhaHash || senha) usuario.senhaHash = senhaHash || senha;
    await usuario.save();
    res.json({ mensagem: 'Cadastro completado com sucesso!', usuario: sanitize(usuario) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao completar cadastro.' });
  }
});

// ---------- API: CATEGORIES ----------
app.get('/api/categories', (req, res) => {
  const candidates = [
    path.join(FRONTEND_PATH, 'data', 'categories.json'),
    path.join(ROOT_DIR, 'frontend', 'data', 'categories.json'),
    path.join(__dirname, 'frontend', 'data', 'categories.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  return res.json({});
});

// ---------- API: REACTIONS (NOVO) ----------
app.get('/api/reactions', (req, res) => {
  const candidates = [
    path.join(FRONTEND_PATH, 'data', 'reactions.json'),
    path.join(ROOT_DIR, 'frontend', 'data', 'reactions.json'),
    path.join(__dirname, 'frontend', 'data', 'reactions.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  // Fallback
  return res.json([
    { id: 'amei',       label: 'Amei',        emoji: '😍' },
    { id: 'quero-mais', label: 'Quero mais',  emoji: '⭐' },
    { id: 'e-ok',       label: 'É ok',        emoji: '😐' },
    { id: 'chorei',     label: 'Chorei',      emoji: '😭' },
    { id: 'curti',      label: 'Curti',       emoji: '👍' },
    { id: 'fraco',      label: 'Fraco',       emoji: '😕' },
    { id: 'engracado',  label: 'Engraçado',   emoji: '😂' },
    { id: 'muito-ruim', label: 'Muito ruim',  emoji: '👎' }
  ]);
});

// ---------- API: BOOK DETAIL ----------
app.get('/api/book/:volumeId', async (req, res) => {
  try {
    const { volumeId } = req.params;
    let snapshot = await BookSnapshot.findOne({ volumeId });
    if (snapshot) return res.json({ source: 'db', book: snapshot });
    const gb = await fetchGoogleBookByVolumeId(volumeId);
    const info = gb.volumeInfo || {};
    const snapData = {
      volumeId,
      title: info.title || '',
      authors: info.authors || [],
      description: info.description || '',
      categories: info.categories || [],
      industryIdentifiers: info.industryIdentifiers || [],
      thumbnail: info.imageLinks?.thumbnail || '',
      publishedDate: info.publishedDate || ''
    };
    try { await BookSnapshot.create(snapData); } catch (e) {}
    return res.json({ source: 'google', book: snapData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao buscar livro.' });
  }
});

// ---------- API: COMENTÁRIOS ----------
app.get('/api/book/:volumeId/comments', async (req, res) => {
  try {
    const { volumeId } = req.params;
    const page  = Math.max(0, parseInt(req.query.page || '0', 10));
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const comments = await Comment.find({ bookVolumeId: volumeId })
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate('userId', 'nome usuario');
    return res.json({ comments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao buscar comentários.' });
  }
});

app.post('/api/book/:volumeId/comment', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { volumeId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ mensagem: 'Comentário vazio.' });
    if (text.length > 2000) return res.status(400).json({ mensagem: 'Comentário muito longo.' });
    const comment = new Comment({ userId: req.user._id, bookVolumeId: volumeId, text: text.trim() });
    await comment.save();
    await comment.populate('userId', 'nome usuario');
    return res.json({ mensagem: 'Comentário salvo.', comment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao salvar comentário.' });
  }
});

app.delete('/api/book/:volumeId/comment/:commentId', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ mensagem: 'Comentário não encontrado.' });
    if (String(comment.userId) !== String(req.user._id))
      return res.status(403).json({ mensagem: 'Somente o autor pode excluir.' });
    await comment.deleteOne();
    return res.json({ mensagem: 'Comentário removido.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao remover comentário.' });
  }
});

// ================================================================
// ============ ROTAS: SHELF (NOVO — usando ShelfItem) ============
// ================================================================

// ---------- API: SHELF (listar) ----------
app.get('/api/shelf', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const itens = await ShelfItem.find({ userId: req.user._id }).sort({ addedAt: -1 }).lean();
    const livros = itens.map(i => ({
      volumeId: i.volumeId,
      title: i.title || '',
      authors: i.authors || [],
      thumbnail: i.thumbnail || '',
      publishedDate: i.publishedDate || '',
      categories: i.categories || [],
      description: i.description || '',
      isbn: i.isbn || '',
      status: i.status,
      currentPage: i.currentPage,
      currentChapter: i.currentChapter,
      reactions: i.reactions || [],
      userRating: i.userRating,
      addedAt: i.addedAt,
      updatedAt: i.updatedAt
    }));
    return res.json({ livros });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao buscar estante.' });
  }
});

// ---------- API: SHELF (item específico) ----------
app.get('/api/shelf/item/:volumeId', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { volumeId } = req.params;
    const item = await ShelfItem.findOne({ userId: req.user._id, volumeId }).lean();
    if (!item) return res.status(404).json({ mensagem: 'Item não encontrado na estante.' });
    return res.json({ item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao buscar item.' });
  }
});

// ---------- API: SHELF (adicionar) ----------
app.post('/api/shelf/add', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { volumeId } = req.body;
    if (!volumeId) return res.status(400).json({ mensagem: 'volumeId obrigatório.' });

    // Garante snapshot do livro
    let snapshot = await BookSnapshot.findOne({ volumeId });
    if (!snapshot) {
      try {
        const gb = await fetchGoogleBookByVolumeId(volumeId);
        const info = gb.volumeInfo || {};
        const snapData = {
          volumeId,
          title: info.title || '',
          authors: info.authors || [],
          description: info.description || '',
          categories: info.categories || [],
          industryIdentifiers: info.industryIdentifiers || [],
          thumbnail: info.imageLinks?.thumbnail || '',
          publishedDate: info.publishedDate || ''
        };
        snapshot = await BookSnapshot.create(snapData).catch(async () =>
          await BookSnapshot.findOne({ volumeId })
        );
      } catch (e) { /* segue */ }
    }

    // Verifica se já existe
    const exists = await ShelfItem.findOne({ userId: req.user._id, volumeId });
    if (exists) return res.status(400).json({ mensagem: 'Livro já está na estante.' });

    const isbnObj = (snapshot?.industryIdentifiers || []).find(i => /ISBN/.test(i.type || '')) || null;
    const isbn = isbnObj ? (isbnObj.identifier || '') : '';

    const item = await ShelfItem.create({
      userId: req.user._id,
      volumeId,
      title: snapshot?.title || '',
      authors: snapshot?.authors || [],
      thumbnail: snapshot?.thumbnail || '',
      publishedDate: snapshot?.publishedDate || '',
      categories: snapshot?.categories || [],
      description: snapshot?.description || '',
      isbn,
      status: 'quero'
    });

    return res.json({ mensagem: 'Livro adicionado à estante.', item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao adicionar livro à estante.' });
  }
});

// ---------- API: SHELF (atualizar) ----------
app.post('/api/shelf/update', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { volumeId, status, currentPage, currentChapter, reactions, userRating } = req.body;
    if (!volumeId) return res.status(400).json({ mensagem: 'volumeId obrigatório.' });
    if (!status) return res.status(400).json({ mensagem: 'Status é obrigatório.' });

    const STATUS_VALIDOS = ['quero', 'lendo', 'terminei', 'pausei', 'desisti'];
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ mensagem: 'Status inválido.' });
    }

    const item = await ShelfItem.findOne({ userId: req.user._id, volumeId });
    if (!item) return res.status(404).json({ mensagem: 'Livro não está na estante.' });

    item.status = status;
    item.currentPage = (status === 'lendo' && currentPage != null) ? Number(currentPage) : null;
    item.currentChapter = (status === 'lendo' && currentChapter) ? String(currentChapter) : '';
    item.reactions = Array.isArray(reactions) ? reactions : [];

    // Nota: só inteiro 0-10
    if (userRating === null || userRating === undefined || userRating === '') {
      item.userRating = null;
    } else {
      const n = Math.round(Number(userRating));
      if (isNaN(n) || n < 0 || n > 10) {
        return res.status(400).json({ mensagem: 'Nota deve ser inteiro entre 0 e 10.' });
      }
      item.userRating = n;
    }

    item.updatedAt = new Date();
    await item.save();

    return res.json({ mensagem: 'Alterações salvas.', item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao atualizar item.' });
  }
});

// ---------- API: SHELF (remover) ----------
app.post('/api/shelf/remove', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { volumeId } = req.body;
    if (!volumeId) return res.status(400).json({ mensagem: 'volumeId obrigatório.' });
    const r = await ShelfItem.deleteOne({ userId: req.user._id, volumeId });
    if (r.deletedCount === 0) return res.status(404).json({ mensagem: 'Livro não encontrado na estante.' });
    return res.json({ mensagem: 'Livro removido da estante.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao remover livro da estante.' });
  }
});

// ---------- LOGOUT ----------
app.get('/api/logout', (req, res) => {
  req.logout(() => req.session.destroy(() => res.json({ mensagem: 'Logout efetuado' })));
});

// ---------- START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));