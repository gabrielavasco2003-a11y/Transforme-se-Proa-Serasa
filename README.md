# Spoiler Esperado

<p align="center">
  <img src="img/logo/Logotipo_Logo_ModoClaro.png" alt="Logo Spoiler Esperado" width="320">
</p>

## Sobre o projeto

**Spoiler Esperado** é uma plataforma web voltada para leitores. O projeto permite descobrir livros, pesquisar títulos, visualizar informações de obras, organizar uma estante pessoal e interagir com os livros por meio de avaliações, reações e comentários.

A aplicação foi desenvolvida como projeto do **Transforme-se PROA + Serasa**, utilizando um frontend em HTML, CSS e JavaScript e um backend em Node.js com Express e MongoDB.

## Funcionalidades

- Cadastro e login de usuários
- Login com Google
- Sessão de usuário persistida no MongoDB
- Recuperação de senha por código enviado por e-mail
- Validação de telefone por código SMS
- Busca de livros utilizando a Google Books API
- Listagem de livros em alta e lançamentos
- Página de detalhes do livro
- Comentários em livros
- Estante pessoal do usuário
- Status de leitura:
  - Quero ler
  - Lendo
  - Terminei
  - Pausei
  - Desisti
- Registro de página e capítulo atual
- Reações aos livros
- Avaliação pessoal de 0 a 10
- Dados locais para categorias, reações e livros do Prêmio Jabuti
- Service Worker para cache de páginas e arquivos estáticos

## Tecnologias utilizadas

### Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API
- Service Worker
- Cache API

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- Express Session
- Connect Mongo
- Passport
- Passport Google OAuth 2.0
- CORS
- Dotenv

### APIs e serviços externos

- Google Books API
- Google OAuth 2.0
- Brevo API para envio de e-mails
- StackVerify para envio de SMS

## Estrutura do projeto

```text
Transforme-se-Proa-Serasa/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── teste.http
│
├── frontend/
│   ├── css/
│   ├── data/
│   ├── html/
│   └── js/
│
├── img/
│   ├── logo/
│   ├── mascote/
│   └── sem-capa.jpg
│
└── .gitignore
```

## Pré-requisitos

Antes de executar o projeto, tenha instalado:

- Node.js
- npm
- Uma instância do MongoDB ou MongoDB Atlas

Também são necessárias credenciais para os serviços externos usados pela aplicação.

## Configuração

Clone o repositório:

```bash
git clone https://github.com/gabrielavasco2003-a11y/Transforme-se-Proa-Serasa.git
```

Entre na pasta do projeto:

```bash
cd Transforme-se-Proa-Serasa
```

Entre no backend e instale as dependências:

```bash
cd backend
npm install
```

Crie o arquivo `.env` com base no `.env.example`:

```env
MONGO_URI=
SESSION_SECRET=

BREVO_API_KEY=
EMAIL_FROM=
EMAIL_FROM_NAME=

SMS_API_TOKEN=

GOOGLE_BOOKS_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

PORT=3000
```

Preencha cada variável com suas próprias credenciais.

## Executando localmente

Na pasta `backend`, execute:

```bash
npm start
```

O servidor será iniciado, por padrão, em:

```text
http://localhost:3000
```

O próprio backend disponibiliza os arquivos estáticos do frontend, então não é necessário iniciar um servidor separado para a interface.

## Principais páginas

| Página | Função |
|---|---|
| `index.html` | Página inicial |
| `login.html` | Login |
| `cadastro.html` | Cadastro |
| `completar.html` | Complementação de cadastro |
| `perfil.html` | Perfil do usuário |
| `editar-perfil.html` | Edição de perfil |
| `busca.html` | Busca de livros |
| `book.html` | Detalhes do livro |
| `shelf.html` | Estante pessoal |
| `edit-shelf.html` | Atualização de leitura e avaliação |
| `recuperar-email.html` | Início da recuperação de senha |
| `recuperar-codigo.html` | Validação do código de recuperação |
| `recuperar-senha.html` | Definição da nova senha |
| `validar-telefone.html` | Envio do código de telefone |
| `validar-codigo.html` | Validação do código recebido |

## Principais rotas da API

### Usuário e autenticação

```text
POST   /api/cadastro
POST   /api/login
GET    /api/me
GET    /api/perfil/:email
DELETE /api/excluir
GET    /api/logout
GET    /api/google
GET    /api/google/callback
POST   /api/completar
```

### Recuperação e validação

```text
POST /api/recuperar/enviar-codigo
POST /api/recuperar/validar-codigo
POST /api/recuperar/nova-senha
POST /api/validar-telefone/enviar
POST /api/validar-telefone/validar
```

### Livros

```text
GET /api/books/em-alta
GET /api/books/novos
GET /api/books/search
GET /api/book/:volumeId
```

### Comentários

```text
GET    /api/book/:volumeId/comments
POST   /api/book/:volumeId/comment
DELETE /api/book/:volumeId/comment/:commentId
```

### Estante

```text
GET  /api/shelf
GET  /api/shelf/item/:volumeId
POST /api/shelf/add
POST /api/shelf/update
POST /api/shelf/remove
```

## Banco de dados

A aplicação utiliza MongoDB com Mongoose.

Os principais modelos são:

- `User`
- `ShelfItem`
- `BookSnapshot`
- `Comment`
- `RecoveryCode`
- `PhoneVerification`

Mais detalhes sobre os modelos, endpoints e fluxo da aplicação estão em [`DOCUMENTACAO.md`](DOCUMENTACAO.md).

## Observações

O projeto utiliza cookies e sessões para autenticação. Algumas funcionalidades dependem de serviços externos e, portanto, precisam das respectivas variáveis de ambiente configuradas.

As rotas da Google Books API são acessadas pelo backend, evitando expor a chave da API diretamente no frontend.

## Documentação

A documentação técnica completa está disponível em:

[`DOCUMENTACAO.md`](DOCUMENTACAO.md)

## Licença

O `package.json` atual do backend está configurado com a licença **ISC**.
