const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// 🎯 DIAGNÓSTICO E MAPEAMENTO DE CAMINHOS ROBUSTOS
const ROOT_DIR = process.cwd();

// Tenta localizar a pasta do frontend independentemente de onde o Node foi iniciado
const possibleFrontendPaths = [
  path.resolve(ROOT_DIR, 'frontend'),
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, 'frontend')
];

let FRONTEND_PATH = possibleFrontendPaths.find(p => fs.existsSync(p)) || possibleFrontendPaths[0];
let HTML_PATH = path.join(FRONTEND_PATH, 'html');

console.log('--- RESOLUÇÃO DE CAMINHOS ---');
console.log('Pasta Frontend localiza em:', FRONTEND_PATH);
console.log('Pasta HTML localizada em:', HTML_PATH);

// Servir arquivos estáticos (CSS, JS, Imagens)
app.use(express.static(FRONTEND_PATH));
app.use(express.static(HTML_PATH));

// Função auxiliar para envio seguro de HTML
const sendHtmlFile = (fileName, res) => {
  const primaryPath = path.join(HTML_PATH, fileName);
  if (fs.existsSync(primaryPath)) {
    return res.sendFile(primaryPath);
  }
  
  // Fallback de segurança procurando em alternativas comuns de diretório
  const fallbackPath = path.resolve(ROOT_DIR, 'frontend/html', fileName);
  if (fs.existsSync(fallbackPath)) {
    return res.sendFile(fallbackPath);
  }

  res.status(404).send(`Não foi possível obter /${fileName}`);
};

// 🎯 ROTAS EXPLÍCITAS DE PÁGINAS HTML
app.get('/completar.html', (req, res) => sendHtmlFile('completar.html', res));
app.get('/perfil.html', (req, res) => sendHtmlFile('perfil.html', res));
app.get('/index.html', (req, res) => sendHtmlFile('index.html', res));
app.get('/', (req, res) => sendHtmlFile('index.html', res));

// Sessão para login com Google
app.use(session({ secret: 'segredo', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Conexão com MongoDB Atlas
mongoose.connect('mongodb+srv://spoileresperado_db_user:FtwEXDbuJpWc9sdp@cluster0.r4zyhor.mongodb.net/spoilerEsperadoDB')
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error(err));

// Modelo de Usuário
const UserSchema = new mongoose.Schema({
  nome: String,
  usuario: String,
  email: String,
  senhaHash: String,
  telefone: String,
  nascimento: Date,
  googleId: String,
  livros: Array
});

const User = mongoose.model('User', UserSchema);

// Cadastro normal
app.post('/api/cadastro', async (req, res) => {
  try {
    const novoUsuario = new User(req.body);
    await novoUsuario.save();
    res.json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao cadastrar usuário.' });
  }
});

// Login normal
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.status(400).json({ mensagem: 'Usuário não encontrado!' });
    }

    if (usuario.senhaHash !== senha) {
      return res.status(400).json({ mensagem: 'Senha incorreta!' });
    }

    res.json({ mensagem: 'Login realizado com sucesso!', usuario });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao realizar login.' });
  }
});

// Perfil
app.get('/api/perfil/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado!' });
    }

    res.json(usuario);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar perfil.' });
  }
});

// Exclusão de conta
app.delete('/api/excluir', async (req, res) => {
  const { email } = req.body;

  try {
    const usuario = await User.findOneAndDelete({ email });

    if (!usuario) {
      return res.status(400).json({ mensagem: 'Usuário não encontrado!' });
    }

    res.json({ mensagem: 'Conta excluída com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao excluir conta.' });
  }
});

// ✅ Identifica automaticamente se está no Render ou no Localhost
const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

// Configuração do Google Strategy
passport.use(new GoogleStrategy({
  clientID: "1000985376031-mki0ocspop293jadrvd3lmhdnnoo687t.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: `${BASE_URL}/api/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let usuario = await User.findOne({ googleId: profile.id });
    if (!usuario) {
      usuario = new User({
        nome: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id
      });
      await usuario.save();
    }
    return done(null, usuario);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((usuario, done) => {
  done(null, usuario.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const usuario = await User.findById(id);
    done(null, usuario);
  } catch (err) {
    done(err, null);
  }
});

// Rotas Google com salvamento de sessão explícito
app.get('/api/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    req.session.save((err) => {
      if (err) {
        return res.redirect('/');
      }
      const usuario = req.user;
      if (!usuario.telefone || !usuario.nascimento || !usuario.senhaHash) {
        return res.redirect('/completar.html');
      }
      res.redirect('/perfil.html');
    });
  }
);

// Completar cadastro após login com Google
app.post('/api/completar', async (req, res) => {
  const { telefone, nascimento, senhaHash } = req.body;

  try {
    if (!req.user) {
      return res.status(401).json({ mensagem: 'Usuário não autenticado!' });
    }

    const usuario = await User.findById(req.user._id);

    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado!' });
    }

    usuario.telefone = telefone;
    usuario.nascimento = nascimento;
    usuario.senhaHash = senhaHash;

    await usuario.save();

    res.json({ mensagem: 'Cadastro completado com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao completar cadastro.' });
  }
});

// Porta dinâmica
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));