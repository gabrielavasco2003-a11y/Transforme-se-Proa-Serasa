require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');
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
const DATA_PATH = path.join(FRONTEND_PATH, 'data');

const possibleImgPaths = [
  path.resolve(FRONTEND_PATH, '..', 'img'),
  path.resolve(ROOT_DIR, 'img'),
  path.resolve(ROOT_DIR, '..', 'img'),
  path.resolve(__dirname, '..', 'img'),
  path.resolve(FRONTEND_PATH, 'img')
];
const IMG_PATH = possibleImgPaths.find(p => fs.existsSync(p)) || possibleImgPaths[0];

console.log('--- RESOLUÇÃO DE CAMINHOS ---');
console.log('ROOT     :', ROOT_DIR);
console.log('FRONTEND :', FRONTEND_PATH);
console.log('HTML     :', HTML_PATH);
console.log('IMG      :', IMG_PATH);
console.log('DATA     :', DATA_PATH);
console.log('IMG ok?  :', fs.existsSync(IMG_PATH));

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

app.use('/img', express.static(IMG_PATH));
console.log('Servindo /img de:', IMG_PATH);

if (fs.existsSync(DATA_PATH)) {
  app.use('/data', express.static(DATA_PATH));
  console.log('Servindo /data de:', DATA_PATH);
} else {
  console.warn('AVISO: pasta DATA não encontrada em', DATA_PATH);
}

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

app.get('/edit-shelf.html',   (req, res) => sendHtmlFile('edit-shelf.html', res));
app.get('/edit-shelf',        (req, res) => sendHtmlFile('edit-shelf.html', res));

app.get('/book.html',         (req, res) => sendHtmlFile('book.html', res));
app.get('/book',              (req, res) => sendHtmlFile('book.html', res));

app.get('/busca.html',        (req, res) => sendHtmlFile('busca.html', res));
app.get('/busca',             (req, res) => sendHtmlFile('busca.html', res));

app.get('/recuperar-email.html',  (req, res) => sendHtmlFile('recuperar-email.html', res));
app.get('/recuperar-codigo.html', (req, res) => sendHtmlFile('recuperar-codigo.html', res));
app.get('/recuperar-senha.html',  (req, res) => sendHtmlFile('recuperar-senha.html', res));
app.get('/validar-telefone.html', (req, res) => sendHtmlFile('validar-telefone.html', res));
app.get('/validar-codigo.html',   (req, res) => sendHtmlFile('validar-codigo.html', res));

// ---------- ROTAS HTML: INSTITUCIONAIS + CONQUISTAS + CONFIGURAÇÕES ----------
app.get('/quem-somos.html',           (req, res) => sendHtmlFile('quem-somos.html', res));
app.get('/quem-somos',                (req, res) => sendHtmlFile('quem-somos.html', res));

app.get('/termos-servicos.html',      (req, res) => sendHtmlFile('termos-servicos.html', res));
app.get('/termos-servicos',           (req, res) => sendHtmlFile('termos-servicos.html', res));

app.get('/politica-privacidade.html', (req, res) => sendHtmlFile('politica-privacidade.html', res));
app.get('/politica-privacidade',      (req, res) => sendHtmlFile('politica-privacidade.html', res));

app.get('/fale-conosco.html',         (req, res) => sendHtmlFile('fale-conosco.html', res));
app.get('/fale-conosco',              (req, res) => sendHtmlFile('fale-conosco.html', res));

app.get('/conquistas.html',           (req, res) => sendHtmlFile('conquistas.html', res));
app.get('/conquistas',                (req, res) => sendHtmlFile('conquistas.html', res));

app.get('/configuracoes.html',        (req, res) => sendHtmlFile('configuracoes.html', res));
app.get('/configuracoes',             (req, res) => sendHtmlFile('configuracoes.html', res));

// ---------- ADICIONAR LIVRO ----------
app.get('/adicionar-livro.html', (req, res) => sendHtmlFile('adicionar-livro.html', res));
app.get('/adicionar-livro',      (req, res) => sendHtmlFile('adicionar-livro.html', res));

// ---------- MONGO ----------
const MONGO_URI = process.env.MONGO_URI;

// ---------- SESSÃO ----------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-troque-em-producao',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 // 24h
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
    secure: 'auto',
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro MongoDB:', err));


// ---------- MODELO: SHELF ITEM ----------
const ShelfItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  volumeId: { type: String, required: true, index: true },
  title: String,
  authors: [String],
  thumbnail: String,
  publishedDate: String,
  categories: [String],
  description: String,
  isbn: String,
  status: { type: String, default: 'quero' },
  currentPage: { type: Number, default: null },
  currentChapter: { type: String, default: '' },
  reactions: { type: [String], default: [] },
  userRating: { type: Number, default: null, min: 0, max: 10 },
  manual: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

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

// ---------- MODELO: RATING ----------
const RatingSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookVolumeId: { type: String, required: true, index: true },
  value:        { type: Number, required: true, min: 0, max: 10 },
  updatedAt:    { type: Date, default: Date.now }
}, { timestamps: true });

RatingSchema.index({ userId: 1, bookVolumeId: 1 }, { unique: true });
const Rating = mongoose.model('Rating', RatingSchema);

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

function buildGoogleBooksUrl(pathAndQuery) {
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  return GOOGLE_API_KEY
    ? `${GOOGLE_BOOKS_BASE}${pathAndQuery}${sep}key=${GOOGLE_API_KEY}`
    : `${GOOGLE_BOOKS_BASE}${pathAndQuery}`;
}

async function fetchGoogleBookByVolumeId(volumeId) {
  const url = buildGoogleBooksUrl(`/${encodeURIComponent(volumeId)}`);
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

// ================================================================
// ============ NOVO: ATUALIZAR AVATAR DO PERFIL ==================
// ================================================================
app.post('/api/perfil/avatar', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { avatar } = req.body;

    const AVATARES_VALIDOS = [
      '/img/perfil/1.png','/img/perfil/2.png','/img/perfil/3.png',
      '/img/perfil/4.png','/img/perfil/5.png','/img/perfil/6.png',
      '/img/perfil/7.png','/img/perfil/8.png','/img/perfil/9.png'
    ];

    if (!avatar || !AVATARES_VALIDOS.includes(avatar)) {
      return res.status(400).json({ mensagem: 'Avatar inválido.' });
    }

    const usuario = await User.findById(req.user._id);
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado.' });

    usuario.avatar = avatar;
    await usuario.save();

    return res.json({ mensagem: 'Avatar atualizado!', avatar: usuario.avatar });
  } catch (err) {
    console.error('Erro em /api/perfil/avatar:', err);
    return res.status(500).json({ mensagem: 'Erro ao salvar avatar.' });
  }
});

// ================================================================
// ============ NOVO: ATUALIZAR DADOS DO PERFIL ===================
// ================================================================
app.post('/api/perfil/atualizar', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });

    const { nome, usuario: username, senha } = req.body;

    const u = await User.findById(req.user._id);
    if (!u) return res.status(404).json({ mensagem: 'Usuário não encontrado.' });

    if (nome)     u.nome = String(nome).trim();
    if (username) u.usuario = String(username).trim();
    if (senha) {
      if (String(senha).length < 6) {
        return res.status(400).json({ mensagem: 'Senha deve ter ao menos 6 caracteres.' });
      }
      u.senhaHash = String(senha);
    }

    await u.save();

    return res.json({ mensagem: 'Perfil atualizado!', usuario: sanitize(u) });
  } catch (err) {
    console.error('Erro em /api/perfil/atualizar:', err);
    return res.status(500).json({ mensagem: 'Erro ao atualizar perfil.' });
  }
});

// ================================================================
// ============ NOVO: CONFIGURAÇÕES DO USUÁRIO ====================
// ================================================================
app.get('/api/config', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const u = await User.findById(req.user._id).select('config').lean();
    return res.json({ config: u?.config || {} });
  } catch (err) {
    console.error('Erro em GET /api/config:', err);
    return res.status(500).json({ mensagem: 'Erro ao buscar configurações.' });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });

    const { language, dateFormat } = req.body;

    const LANG_VALIDOS  = ['pt-BR', 'en'];
    const DATES_VALIDOS = ['DD/MM/YYYY', 'MM/DD/YYYY'];

    const novo = {};
    if (LANG_VALIDOS.includes(language))     novo['config.language']   = language;
    if (DATES_VALIDOS.includes(dateFormat))  novo['config.dateFormat'] = dateFormat;

    if (Object.keys(novo).length) {
      await User.findByIdAndUpdate(req.user._id, { $set: novo });
    }

    return res.json({ mensagem: 'Configurações salvas!' });
  } catch (err) {
    console.error('Erro em POST /api/config:', err);
    return res.status(500).json({ mensagem: 'Erro ao salvar configurações.' });
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

// ---------- API: REACTIONS ----------
app.get('/api/reactions', (req, res) => {
  const candidates = [
    path.join(FRONTEND_PATH, 'data', 'reactions.json'),
    path.join(ROOT_DIR, 'frontend', 'data', 'reactions.json'),
    path.join(__dirname, 'frontend', 'data', 'reactions.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
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

// ================================================================
// ============ GOOGLE BOOKS (proxy seguro) =======================
// ================================================================

function mapGoogleItem(item) {
  const info = item.volumeInfo || {};
  return {
    volumeId: item.id,
    title: info.title || '',
    authors: info.authors || [],
    thumbnail: info.imageLinks?.thumbnail || '',
    averageRating: info.averageRating || 0,
    ratingsCount: info.ratingsCount || 0,
    publishedDate: info.publishedDate || '',
    categories: info.categories || [],
    description: info.description || ''
  };
}

async function fetchGoogleBooksWithFallback(tentativas) {
  let ultimoStatus = 0;
  for (const t of tentativas) {
    try {
      const url = new URL(GOOGLE_BOOKS_BASE);
      Object.entries(t).forEach(([k, v]) => {
        if (v != null) url.searchParams.set(k, String(v));
      });
      if (GOOGLE_API_KEY) url.searchParams.set('key', GOOGLE_API_KEY);

      const resp = await fetch(url);
      if (!resp.ok) {
        ultimoStatus = resp.status;
        const erro = await resp.text();
        console.error('Google Books erro:', resp.status, erro.slice(0, 200));
        continue;
      }
      const data = await resp.json();
      if (data.items && data.items.length) {
        return { items: data.items, totalItems: data.totalItems || data.items.length };
      }
    } catch (e) {
      console.error('Falha em tentativa Google Books:', e.message);
    }
  }
  return { items: [], totalItems: 0, ultimoStatus };
}

app.get('/api/books/em-alta', async (req, res) => {
  try {
    const { items, totalItems } = await fetchGoogleBooksWithFallback([
      { q: 'best seller',       maxResults: 10, printType: 'books' },
      { q: 'subject:fiction',   maxResults: 10, orderBy: 'relevance', printType: 'books' },
      { q: 'harry potter',      maxResults: 10, printType: 'books' }
    ]);
    return res.json({ totalItems, items: items.map(mapGoogleItem) });
  } catch (err) {
    console.error('Erro em /api/books/em-alta:', err);
    return res.json({ totalItems: 0, items: [] });
  }
});

app.get('/api/books/novos', async (req, res) => {
  try {
    const { items, totalItems } = await fetchGoogleBooksWithFallback([
      { q: 'subject:fiction', orderBy: 'newest',    maxResults: 12, printType: 'books', langRestrict: 'pt' },
      { q: 'subject:fiction', orderBy: 'newest',    maxResults: 12, printType: 'books' },
      { q: 'romance',         orderBy: 'newest',    maxResults: 12, printType: 'books' },
      { q: 'fiction',         orderBy: 'relevance', maxResults: 12, printType: 'books' }
    ]);
    return res.json({ totalItems, items: items.map(mapGoogleItem) });
  } catch (err) {
    console.error('Erro em /api/books/novos:', err);
    return res.json({ totalItems: 0, items: [] });
  }
});

app.get('/api/books/search', async (req, res) => {
  try {
    const q          = String(req.query.q || 'subject:fiction');
    const maxResults = String(req.query.maxResults || '24');
    const orderBy    = String(req.query.orderBy || 'relevance');
    const startIndex = req.query.startIndex ? String(req.query.startIndex) : null;

    const url = new URL(GOOGLE_BOOKS_BASE);
    url.searchParams.set('q', q);
    url.searchParams.set('maxResults', maxResults);
    url.searchParams.set('orderBy', orderBy);
    if (startIndex) url.searchParams.set('startIndex', startIndex);
    if (GOOGLE_API_KEY) url.searchParams.set('key', GOOGLE_API_KEY);

    const resp = await fetch(url);
    const text = await resp.text();
    res.status(resp.status).type('application/json').send(text);
  } catch (err) {
    console.error('Erro em /api/books/search:', err);
    res.status(500).json({ error: { message: 'Erro interno ao consultar Google Books.' } });
  }
});

// ================================================================
// ============ DETALHE DO LIVRO (prioriza dados locais) ==========
// ================================================================
app.get('/api/book/:volumeId', async (req, res) => {
  try {
    const { volumeId } = req.params;

    // 1) Prioriza snapshot local (livros manuais ou já cacheados)
    let snapshot = await BookSnapshot.findOne({ volumeId }).lean();

    // 2) Se não existir, busca na Google Books e cacheia
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
        try {
          snapshot = await BookSnapshot.create(snapData);
        } catch (e) {
          // Corrida: outro request criou antes — busca de novo
          snapshot = await BookSnapshot.findOne({ volumeId }).lean();
        }
        return res.json({ source: 'google', book: snapshot || snapData });
      } catch (e) {
        return res.status(404).json({ mensagem: 'Livro não encontrado.' });
      }
    }

    // 3) Snapshot local encontrado — determina se é manual
    const manual = await ShelfItem.exists({ volumeId, manual: true });
    return res.json({
      source: 'db',
      manual: !!manual,
      book: snapshot
    });
  } catch (err) {
    console.error('Erro em /api/book/:volumeId:', err);
    return res.status(500).json({ mensagem: 'Erro ao buscar livro.' });
  }
});

// ================================================================
// ============ ROTAS: RATING (nota por livro) ====================
// ================================================================
app.get('/api/book/:volumeId/rating', async (req, res) => {
  try {
    const { volumeId } = req.params;

    const agg = await Rating.aggregate([
      { $match: { bookVolumeId: volumeId } },
      { $group: { _id: null, media: { $avg: '$value' }, total: { $sum: 1 } } }
    ]);
    const media = agg[0]?.media ? Number(agg[0].media.toFixed(1)) : null;
    const total = agg[0]?.total || 0;

    let minhaNota = null;
    if (req.user) {
      const r = await Rating.findOne({ userId: req.user._id, bookVolumeId: volumeId });
      minhaNota = r ? r.value : null;

      // Fallback: se não tem Rating mas tem userRating na shelf, usa
      if (minhaNota == null) {
        const item = await ShelfItem.findOne(
          { userId: req.user._id, volumeId },
          { userRating: 1 }
        ).lean();
        if (item && item.userRating != null) minhaNota = item.userRating;
      }
    }
    return res.json({ media, total, minhaNota });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao buscar avaliações.' });
  }
});

app.post('/api/book/:volumeId/rating', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const { volumeId } = req.params;
    const { value } = req.body;

    if (value === null || value === undefined || value === '') {
      await Rating.deleteOne({ userId: req.user._id, bookVolumeId: volumeId });
      // Também limpa o userRating da shelf (mantém consistência)
      await ShelfItem.updateOne(
        { userId: req.user._id, volumeId },
        { $set: { userRating: null, updatedAt: new Date() } }
      );
      return res.json({ mensagem: 'Nota removida.', media: null, total: 0, minhaNota: null });
    }

    const n = Math.round(Number(value));
    if (isNaN(n) || n < 0 || n > 10) {
      return res.status(400).json({ mensagem: 'Nota deve ser inteiro entre 0 e 10.' });
    }

    await Rating.findOneAndUpdate(
      { userId: req.user._id, bookVolumeId: volumeId },
      { value: n, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Também salva na shelf se o livro estiver lá (mantém consistência)
    await ShelfItem.updateOne(
      { userId: req.user._id, volumeId },
      { $set: { userRating: n, updatedAt: new Date() } }
    );

    const agg = await Rating.aggregate([
      { $match: { bookVolumeId: volumeId } },
      { $group: { _id: null, media: { $avg: '$value' }, total: { $sum: 1 } } }
    ]);
    const media = agg[0]?.media ? Number(agg[0].media.toFixed(1)) : null;
    const total = agg[0]?.total || 0;

    return res.json({ mensagem: 'Nota salva.', media, total, minhaNota: n });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao salvar avaliação.' });
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
// ============ ROTAS: SHELF (usando ShelfItem) ===================
// ================================================================
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
      manual: i.manual || false,
      addedAt: i.addedAt,
      updatedAt: i.updatedAt
    }));
    return res.json({ livros });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao buscar estante.' });
  }
});

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

// ================================================================
// ============ SHELF: ADD (cria OU atualiza) =====================
// Aceita: volumeId, status, reaction (string), reactions (array),
//         currentPage, chapter | currentChapter, userRating
// ================================================================
app.post('/api/shelf/add', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });

    const {
      volumeId,
      status,
      reaction,
      reactions,
      currentPage,
      chapter,
      currentChapter,
      userRating
    } = req.body;

    if (!volumeId) return res.status(400).json({ mensagem: 'volumeId obrigatório.' });

    const STATUS_VALIDOS = ['quero', 'lendo', 'terminei', 'pausei', 'desisti'];
    const statusFinal = status && STATUS_VALIDOS.includes(status) ? status : 'quero';

    // Normaliza reactions: aceita string única (reaction) OU array (reactions)
    let reactionsFinal = null;
    if (Array.isArray(reactions)) {
      reactionsFinal = reactions.map(r => String(r)).filter(Boolean);
    } else if (typeof reaction === 'string') {
      reactionsFinal = reaction ? [reaction] : [];
    } else if (reaction === null) {
      reactionsFinal = [];
    }

    // Normaliza capítulo: aceita 'chapter' ou 'currentChapter'
    const capituloFinal = (chapter != null) ? String(chapter)
      : (currentChapter != null) ? String(currentChapter)
      : null;

    // Normaliza página
    let paginaFinal;
    if (currentPage === '' || currentPage === undefined) paginaFinal = undefined;
    else if (currentPage === null) paginaFinal = null;
    else {
      const n = Number(currentPage);
      paginaFinal = isNaN(n) ? undefined : Math.max(0, Math.floor(n));
    }

    // Normaliza nota
    let notaFinal;
    if (userRating === '' || userRating === undefined) notaFinal = undefined;
    else if (userRating === null) notaFinal = null;
    else {
      const n = Math.round(Number(userRating));
      if (!isNaN(n) && n >= 0 && n <= 10) notaFinal = n;
    }

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
      } catch (e) { /* segue sem snapshot */ }
    }

    const exists = await ShelfItem.findOne({ userId: req.user._id, volumeId });

    if (exists) {
      // Atualização parcial: só mexe no que foi enviado
      exists.status = statusFinal;
      if (reactionsFinal !== null)  exists.reactions = reactionsFinal;
      if (capituloFinal !== null)   exists.currentChapter = capituloFinal;
      if (paginaFinal !== undefined) exists.currentPage = paginaFinal;
      if (notaFinal !== undefined)  exists.userRating = notaFinal;
      exists.updatedAt = new Date();
      await exists.save();
      return res.json({ mensagem: 'Item atualizado.', item: exists });
    }

    // Criação
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
      status: statusFinal,
      reactions: reactionsFinal || [],
      currentPage: paginaFinal !== undefined ? paginaFinal : null,
      currentChapter: capituloFinal || '',
      userRating: notaFinal !== undefined ? notaFinal : null
    });

    return res.json({ mensagem: 'Livro adicionado à estante.', item });
  } catch (err) {
    console.error('Erro em /api/shelf/add:', err);
    return res.status(500).json({ mensagem: 'Erro ao adicionar livro à estante.' });
  }
});

// ================================================================
// ============ SHELF: UPDATE (edição completa) ===================
// ================================================================
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

// ================================================================
// ============ ADICIONAR LIVRO MANUALMENTE =======================
// ================================================================
app.post('/api/shelf/add-manual', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });

    const {
      isbn,
      title,
      authors,
      publishedDate,
      categories,
      thumbnail,
      description,
      status
    } = req.body;

    const erros = [];

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      erros.push('Título é obrigatório (mínimo 2 caracteres).');
    }
    if (!Array.isArray(authors) || authors.length === 0 || !authors.some(a => a && a.trim().length >= 2)) {
      erros.push('Pelo menos um autor é obrigatório.');
    }
    if (!publishedDate || !String(publishedDate).trim()) {
      erros.push('Ano de publicação é obrigatório.');
    } else {
      const ano = parseInt(String(publishedDate).split('-')[0], 10);
      const anoAtual = new Date().getFullYear();
      if (isNaN(ano) || ano < 1400 || ano > anoAtual + 1) {
        erros.push(`Ano deve ser entre 1400 e ${anoAtual + 1}.`);
      }
    }
    if (!Array.isArray(categories) || categories.length === 0 || !categories.some(c => c && c.trim().length >= 2)) {
      erros.push('Pelo menos um gênero é obrigatório.');
    }

    const STATUS_VALIDOS = ['quero', 'lendo', 'terminei', 'pausei', 'desisti'];
    const statusFinal = STATUS_VALIDOS.includes(status) ? status : 'quero';

    if (erros.length) {
      return res.status(400).json({ mensagem: 'Dados inválidos.', erros });
    }

    const volumeId = isbn && String(isbn).trim()
      ? `manual-${String(isbn).trim()}`
      : `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const exists = await ShelfItem.findOne({ userId: req.user._id, volumeId });
    if (exists) {
      return res.status(400).json({ mensagem: 'Este livro já está na sua estante.' });
    }

    const item = await ShelfItem.create({
      userId: req.user._id,
      volumeId,
      title: String(title).trim(),
      authors: authors.map(a => String(a).trim()).filter(Boolean),
      thumbnail: thumbnail ? String(thumbnail).trim() : '',
      publishedDate: String(publishedDate).trim(),
      categories: categories.map(c => String(c).trim()).filter(Boolean),
      description: description ? String(description).trim() : '',
      isbn: isbn ? String(isbn).trim() : '',
      status: statusFinal,
      manual: true
    });

    if (isbn && String(isbn).trim()) {
      try {
        await BookSnapshot.findOneAndUpdate(
          { volumeId },
          {
            volumeId,
            title: item.title,
            authors: item.authors,
            description: item.description,
            categories: item.categories,
            thumbnail: item.thumbnail,
            publishedDate: item.publishedDate,
            industryIdentifiers: [{ type: 'ISBN_13', identifier: String(isbn).trim() }]
          },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('Erro ao salvar snapshot do livro manual:', e.message);
      }
    }

    return res.status(201).json({
      mensagem: 'Livro cadastrado manualmente com sucesso!',
      item
    });
  } catch (err) {
    console.error('Erro em /api/shelf/add-manual:', err);
    return res.status(500).json({ mensagem: 'Erro ao cadastrar livro manualmente.' });
  }
});

// ================================================================
// ============ ROTA: BUSCA SIMPLES NA ESTANTE DO USUÁRIO =========
// ================================================================
app.get('/api/search', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    const q = String(req.query.q || '').trim();
    if (!q) {
      const itens = await ShelfItem.find({ userId: req.user._id }).sort({ addedAt: -1 }).lean();
      return res.json({ livros: itens });
    }
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const itens = await ShelfItem.find({
      userId: req.user._id,
      $or: [
        { title: regex },
        { authors: regex },
        { description: regex },
        { categories: regex }
      ]
    }).sort({ addedAt: -1 }).lean();
    return res.json({ livros: itens });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro na busca.' });
  }
});

// ---------- LOGOUT ----------
app.get('/api/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ mensagem: 'Logout efetuado' });
    });
  });
});

// ---------- START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));