const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1); // Render está atrás de proxy

// CORS permitindo cookies/sessão
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
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

console.log('--- RESOLUÇÃO DE CAMINHOS ---');
console.log('ROOT     :', ROOT_DIR);
console.log('FRONTEND :', FRONTEND_PATH);
console.log('HTML     :', HTML_PATH);
console.log('IMG      :', IMG_PATH);

// ---------- ESTÁTICOS ----------
app.use(express.static(FRONTEND_PATH));
if (fs.existsSync(HTML_PATH)) app.use(express.static(HTML_PATH));
if (fs.existsSync(IMG_PATH))  app.use('/img', express.static(IMG_PATH)); // resolve ../../img/...

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
app.get('/',                 (req, res) => sendHtmlFile('index.html', res));
app.get('/index.html',       (req, res) => sendHtmlFile('index.html', res));
app.get('/login.html',       (req, res) => sendHtmlFile('login.html', res));
app.get('/cadastro.html',    (req, res) => sendHtmlFile('cadastro.html', res));
app.get('/completar.html',   (req, res) => sendHtmlFile('completar.html', res));
app.get('/editar-perfil.html',(req, res) => sendHtmlFile('editar-perfil.html', res));
app.get('/perfil.html',      (req, res) => sendHtmlFile('perfil.html', res));
app.get('/perfil',           (req, res) => sendHtmlFile('perfil.html', res)); // ← URL limpa

// ---------- MONGO ----------
const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://spoileresperado_db_user:FtwEXDbuJpWc9sdp@cluster0.r4zyhor.mongodb.net/spoilerEsperadoDB';

// ---------- SESSÃO ----------
app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo-spoiler-esperado',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, collectionName: 'sessions' }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',     // ESSENCIAL p/ OAuth callback funcionar
    secure: false,       // já é HTTPS no Render, mas evitamos bloquear localhost
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro MongoDB:', err));

// ---------- MODELO ----------
const UserSchema = new mongoose.Schema({
  nome: String,
  usuario: String,
  email: { type: String, index: true },
  senhaHash: String,
  telefone: String,
  nascimento: Date,
  googleId: String,
  livros: { type: Array, default: [] }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const sanitize = (user) => {
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.senhaHash;
  return u;
};

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

    // login automático após cadastro
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

// ---------- API: ME (sessão atual) ----------
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
  clientID:     process.env.GOOGLE_CLIENT_ID     || '1000985376031-mki0ocspop293jadrvd3lmhdnnoo687t.apps.googleusercontent.com',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
  callbackURL:  `${BASE_URL}/api/google/callback`,
  proxy: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    // busca por googleId OU email (evita duplicar conta já criada manualmente)
    let usuario = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

    if (!usuario) {
      usuario = new User({
        nome: profile.displayName,
        email,
        googleId: profile.id,
        livros: []
      });
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
      // Se faltar algum dado → completar cadastro
      if (!u.telefone || !u.nascimento || !u.senhaHash) {
        return res.redirect('/completar.html');
      }
      return res.redirect('/perfil'); // ← redireciona para URL limpa
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

    if (telefone)               usuario.telefone = telefone;
    if (nascimento)             usuario.nascimento = new Date(nascimento);
    if (senhaHash || senha)     usuario.senhaHash = senhaHash || senha;

    await usuario.save();
    res.json({ mensagem: 'Cadastro completado com sucesso!', usuario: sanitize(usuario) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao completar cadastro.' });
  }
});

// ---------- LOGOUT ----------
app.get('/api/logout', (req, res) => {
  req.logout(() => req.session.destroy(() => res.json({ mensagem: 'Logout efetuado' })));
});

// ---------- START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));