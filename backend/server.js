const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Servir arquivos estáticos direto da pasta Projeto
app.use(express.static(path.join(__dirname, '..')));

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

// ✅ Cadastro normal
app.post('/api/cadastro', async (req, res) => {
  try {
    const novoUsuario = new User(req.body);
    await novoUsuario.save();
    res.json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao cadastrar usuário.' });
  }
});

// ✅ Login normal
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

// ✅ Perfil
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

// ✅ Exclusão de conta
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

// ✅ Login com Google
passport.use(new GoogleStrategy({
  clientID: "1000985376031-mki0ocspop293jadrvd3lmhdnnoo687t.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: "https://spoiler-esperado.onrender.com/api/google/callback" // Atualizado para o Render
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

// Rotas Google
app.get('/api/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    const usuario = req.user;
    // se for novo, redireciona para completar cadastro
    if (!usuario.telefone || !usuario.nascimento || !usuario.senhaHash) {
      return res.redirect('/completar.html');
    }
    res.redirect('/perfil.html');
  }
);

// ✅ Completar cadastro após login com Google
app.post('/api/completar', async (req, res) => {
  const { telefone, nascimento, senhaHash } = req.body;

  try {
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

// ✅ Porta ajustada para o Render e uso local
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));