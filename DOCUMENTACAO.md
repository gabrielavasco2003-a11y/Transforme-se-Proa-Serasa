# Documentação Técnica — Spoiler Esperado

## 1. Visão geral

O **Spoiler Esperado** é uma aplicação web de organização e descoberta de livros.

A aplicação possui uma arquitetura cliente-servidor simples:

```text
Navegador
   |
   | HTML / CSS / JavaScript
   v
Frontend
   |
   | Fetch / HTTP
   v
Node.js + Express
   |
   +--------> MongoDB
   |
   +--------> Google Books API
   |
   +--------> Google OAuth
   |
   +--------> Brevo
   |
   +--------> StackVerify
```

O backend também funciona como servidor dos arquivos estáticos do frontend.

---

## 2. Arquitetura

### 2.1 Frontend

Localização:

```text
frontend/
```

O frontend foi desenvolvido sem framework, utilizando HTML, CSS e JavaScript.

Principais pastas:

```text
frontend/
├── css/
├── data/
├── html/
└── js/
```

### 2.2 Backend

Localização:

```text
backend/
```

O backend é iniciado pelo arquivo:

```text
backend/server.js
```

O servidor utiliza Express e concentra:

- Servidor dos arquivos estáticos
- Autenticação
- Sessões
- Integração com MongoDB
- Integração com Google OAuth
- Integração com Google Books
- Recuperação de senha
- Validação de telefone
- Gerenciamento da estante
- Comentários de livros

### 2.3 Banco de dados

O banco utilizado é MongoDB, acessado pelo Mongoose.

A conexão é definida pela variável:

```env
MONGO_URI=
```

As sessões também são armazenadas no MongoDB por meio do `connect-mongo`.

---

## 3. Dependências do backend

Dependências presentes no `package.json`:

| Dependência | Função |
|---|---|
| `express` | Servidor HTTP e rotas |
| `mongoose` | Modelagem e acesso ao MongoDB |
| `cors` | Configuração de CORS |
| `dotenv` | Carregamento das variáveis de ambiente |
| `express-session` | Gerenciamento das sessões |
| `connect-mongo` | Persistência das sessões no MongoDB |
| `passport` | Estrutura de autenticação |
| `passport-google-oauth20` | Autenticação com Google OAuth 2.0 |

---

## 4. Variáveis de ambiente

Arquivo de referência:

```text
backend/.env.example
```

Variáveis:

| Variável | Descrição |
|---|---|
| `MONGO_URI` | String de conexão com MongoDB |
| `SESSION_SECRET` | Segredo usado pela sessão |
| `BREVO_API_KEY` | Chave da API Brevo |
| `EMAIL_FROM` | E-mail utilizado como remetente |
| `EMAIL_FROM_NAME` | Nome do remetente |
| `SMS_API_TOKEN` | Token do serviço de SMS |
| `GOOGLE_BOOKS_API_KEY` | Chave da Google Books API |
| `GOOGLE_CLIENT_ID` | Client ID do Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth |
| `PORT` | Porta utilizada pelo servidor |

Em ambiente de hospedagem, o código também utiliza:

```env
RENDER_EXTERNAL_URL=
```

quando disponível, para montar a URL de callback do Google OAuth.

---

## 5. Execução local

### 5.1 Instalar dependências

```bash
cd backend
npm install
```

### 5.2 Criar o arquivo `.env`

Copie as variáveis de `.env.example` para um arquivo `.env` e preencha as credenciais.

### 5.3 Iniciar

```bash
npm start
```

Com a configuração padrão:

```text
http://localhost:3000
```

---

## 6. Servidor de arquivos

O Express disponibiliza os arquivos presentes em:

```text
frontend/
```

Também cria caminhos específicos para:

```text
/img
/data
/sw.js
```

As páginas HTML são disponibilizadas diretamente pelo backend.

Exemplos:

```text
/
 /index.html
 /login.html
 /cadastro.html
 /perfil.html
 /shelf.html
 /edit-shelf.html
```

---

## 7. Modelos do MongoDB

### 7.1 User

Representa um usuário.

Principais campos:

```text
nome
usuario
email
senhaHash
telefone
telefoneVerificado
nascimento
googleId
livros
```

O modelo possui timestamps automáticos.

### 7.2 ShelfItem

Representa um livro na estante de um usuário.

Campos principais:

```text
userId
volumeId
title
authors
thumbnail
publishedDate
categories
description
isbn
status
currentPage
currentChapter
reactions
userRating
addedAt
updatedAt
```

Existe um índice composto único entre:

```text
userId + volumeId
```

Isso evita que o mesmo livro seja adicionado duas vezes à estante do mesmo usuário.

Status aceitos:

```text
quero
lendo
terminei
pausei
desisti
```

A avaliação pessoal aceita valores inteiros entre:

```text
0 e 10
```

### 7.3 BookSnapshot

Armazena localmente dados obtidos da Google Books API.

Campos:

```text
volumeId
title
authors
description
categories
industryIdentifiers
thumbnail
publishedDate
savedAt
```

O objetivo é evitar consultas externas desnecessárias quando o livro já foi salvo anteriormente.

### 7.4 Comment

Representa comentários feitos pelos usuários em livros.

Campos:

```text
userId
bookVolumeId
text
createdAt
editedAt
```

O texto possui limite de 2000 caracteres.

### 7.5 RecoveryCode

Armazena códigos temporários utilizados na recuperação de senha.

Campos:

```text
email
codigo
usado
expiresAt
```

Os códigos expiram automaticamente.

### 7.6 PhoneVerification

Armazena códigos temporários de verificação de telefone.

Campos:

```text
userId
telefone
codigo
usado
expiresAt
```

---

## 8. Autenticação e sessão

A autenticação utiliza:

```text
express-session
passport
connect-mongo
```

A sessão é persistida no MongoDB.

Configuração principal do cookie:

```text
maxAge: 24 horas
sameSite: lax
httpOnly: true
```

O usuário autenticado fica disponível no backend por:

```javascript
req.user
```

---

## 9. Google OAuth

O login com Google utiliza `passport-google-oauth20`.

### Início da autenticação

```http
GET /api/google
```

### Callback

```http
GET /api/google/callback
```

Após o login:

- se o cadastro ainda estiver incompleto, o usuário é direcionado para `completar.html`;
- caso contrário, o usuário é direcionado para `/perfil`.

---

## 10. API de usuários

### POST `/api/cadastro`

Cria um novo usuário.

Exemplo:

```json
{
  "nome": "Nome",
  "usuario": "usuario",
  "email": "email@exemplo.com",
  "senha": "123456",
  "telefone": "11999999999",
  "nascimento": "2000-01-01"
}
```

### POST `/api/login`

Realiza login.

```json
{
  "email": "email@exemplo.com",
  "senha": "123456"
}
```

### GET `/api/me`

Retorna o usuário atualmente autenticado.

Caso não exista sessão válida:

```text
401 Não autenticado
```

### GET `/api/perfil/:email`

Busca um perfil pelo e-mail.

### DELETE `/api/excluir`

Exclui uma conta pelo e-mail recebido no corpo da requisição.

### GET `/api/logout`

Encerra a sessão atual.

### POST `/api/completar`

Completa informações de um usuário autenticado, principalmente após login via Google.

Campos suportados:

```text
telefone
nascimento
senha
senhaHash
```

---

## 11. Recuperação de senha

### POST `/api/recuperar/enviar-codigo`

Solicita um código de recuperação.

```json
{
  "email": "email@exemplo.com"
}
```

O código:

- possui 5 dígitos;
- é enviado por e-mail via Brevo;
- expira em 10 minutos.

### POST `/api/recuperar/validar-codigo`

```json
{
  "email": "email@exemplo.com",
  "codigo": "12345"
}
```

### POST `/api/recuperar/nova-senha`

```json
{
  "email": "email@exemplo.com",
  "codigo": "12345",
  "novaSenha": "novaSenha"
}
```

A nova senha precisa possuir no mínimo 6 caracteres.

---

## 12. Validação de telefone

### POST `/api/validar-telefone/enviar`

Requer usuário autenticado.

```json
{
  "telefone": "11999999999"
}
```

O número é normalizado para o padrão brasileiro E.164.

Exemplo:

```text
+5511999999999
```

O código possui 5 dígitos e expira em 10 minutos.

### POST `/api/validar-telefone/validar`

```json
{
  "codigo": "12345"
}
```

Quando validado, o campo:

```text
telefoneVerificado
```

é atualizado para `true`.

---

## 13. Google Books

A aplicação utiliza:

```text
https://www.googleapis.com/books/v1/volumes
```

As consultas são realizadas pelo backend.

### GET `/api/books/em-alta`

Busca livros utilizando a consulta:

```text
best seller
```

### GET `/api/books/novos`

Busca livros recentes da categoria de ficção.

### GET `/api/books/search`

Parâmetros suportados:

```text
q
maxResults
orderBy
startIndex
```

Exemplo:

```text
/api/books/search?q=harry+potter&maxResults=10
```

### GET `/api/book/:volumeId`

Busca detalhes de um livro.

O backend primeiro verifica se há um `BookSnapshot`.

Se existir:

```json
{
  "source": "db"
}
```

Caso contrário, consulta a Google Books API, salva um snapshot e responde:

```json
{
  "source": "google"
}
```

---

## 14. Comentários

### GET `/api/book/:volumeId/comments`

Lista comentários de um livro.

Parâmetros opcionais:

```text
page
limit
```

O limite máximo é de 50 comentários por requisição.

### POST `/api/book/:volumeId/comment`

Requer autenticação.

```json
{
  "text": "Comentário sobre o livro"
}
```

### DELETE `/api/book/:volumeId/comment/:commentId`

Remove um comentário.

Somente o autor do comentário pode excluí-lo.

---

## 15. Estante

Todas as operações de alteração da estante exigem usuário autenticado.

### GET `/api/shelf`

Lista os livros da estante do usuário.

### GET `/api/shelf/item/:volumeId`

Retorna um item específico da estante.

### POST `/api/shelf/add`

```json
{
  "volumeId": "ID_DO_GOOGLE_BOOKS"
}
```

O backend obtém os dados do livro e cria um `ShelfItem`.

O status inicial é:

```text
quero
```

### POST `/api/shelf/update`

Exemplo:

```json
{
  "volumeId": "ID_DO_GOOGLE_BOOKS",
  "status": "lendo",
  "currentPage": 120,
  "currentChapter": "Capítulo 8",
  "reactions": ["amei"],
  "userRating": 9
}
```

Status aceitos:

```text
quero
lendo
terminei
pausei
desisti
```

### POST `/api/shelf/remove`

```json
{
  "volumeId": "ID_DO_GOOGLE_BOOKS"
}
```

Remove o livro da estante.

---

## 16. Dados estáticos

O frontend contém arquivos JSON em:

```text
frontend/data/
```

Atualmente:

```text
categories.json
jabuti.json
reactions.json
```

As categorias podem ser obtidas por:

```http
GET /api/categories
```

As reações podem ser obtidas por:

```http
GET /api/reactions
```

---

## 17. Funcionamento offline

O projeto possui um Service Worker:

```text
frontend/js/sw.js
```

Ele mantém um cache chamado:

```text
spoiler-esperado-v1
```

Estratégias utilizadas:

- páginas HTML: `network-first`;
- arquivos estáticos: `cache-first` com atualização em segundo plano;
- requisições `/api/`: não são interceptadas pelo Service Worker.

Isso significa que algumas páginas e arquivos previamente armazenados podem continuar disponíveis sem conexão, mas operações que dependem da API continuam exigindo acesso ao servidor.

---

## 18. Fluxos principais

### Cadastro tradicional

```text
cadastro.html
     |
POST /api/cadastro
     |
MongoDB
     |
Sessão criada
```

### Login tradicional

```text
login.html
    |
POST /api/login
    |
Verificação do usuário
    |
Sessão
```

### Login com Google

```text
GET /api/google
    |
Google OAuth
    |
GET /api/google/callback
    |
Usuário criado/localizado
    |
Perfil ou completar cadastro
```

### Busca de livros

```text
busca.html
    |
GET /api/books/search
    |
Backend
    |
Google Books API
```

### Adição à estante

```text
Livro
   |
POST /api/shelf/add
   |
BookSnapshot
   |
ShelfItem
```

---

## 19. Respostas HTTP comuns

| Código | Significado no projeto |
|---|---|
| `200` | Requisição concluída |
| `400` | Dados inválidos ou incompletos |
| `401` | Usuário não autenticado |
| `403` | Operação não permitida |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |

---

## 20. Segurança e melhorias recomendadas

Esta seção documenta pontos importantes do estado atual do código.

### Senhas

Apesar do campo se chamar `senhaHash`, o código atual compara e salva a senha diretamente.

Para uma versão de produção, recomenda-se utilizar um algoritmo de hash apropriado para senhas, como `bcrypt` ou `argon2`, em vez de armazenar senhas em texto puro.

### Exclusão de conta

A rota:

```text
DELETE /api/excluir
```

recebe um e-mail no corpo da requisição.

Em produção, é recomendável exigir autenticação e validar que o usuário autenticado é o proprietário da conta que será excluída.

### Cookies

O código atual utiliza:

```text
secure: false
```

Isso é adequado para desenvolvimento em HTTP local. Em produção com HTTPS, recomenda-se configurar cookies seguros.

### CORS

A configuração atual aceita a origem da requisição com credenciais.

Em produção, recomenda-se limitar explicitamente as origens permitidas.

### Credenciais

Nunca envie o arquivo `.env` para o GitHub.

Apenas `.env.example`, sem valores secretos, deve ser versionado.

---

## 21. Testes manuais

O arquivo:

```text
backend/teste.http
```

contém exemplos de requisições HTTP para:

- cadastro;
- login;
- consulta da sessão atual.

Essas requisições podem ser executadas por extensões de cliente REST compatíveis com arquivos `.http`.

---

## 22. Resumo das rotas

```text
POST   /api/recuperar/enviar-codigo
POST   /api/recuperar/validar-codigo
POST   /api/recuperar/nova-senha

POST   /api/validar-telefone/enviar
POST   /api/validar-telefone/validar

POST   /api/cadastro
POST   /api/login
GET    /api/me
GET    /api/perfil/:email
DELETE /api/excluir

GET    /api/google
GET    /api/google/callback
POST   /api/completar

GET    /api/categories
GET    /api/reactions

GET    /api/books/em-alta
GET    /api/books/novos
GET    /api/books/search
GET    /api/book/:volumeId

GET    /api/book/:volumeId/comments
POST   /api/book/:volumeId/comment
DELETE /api/book/:volumeId/comment/:commentId

GET    /api/shelf
GET    /api/shelf/item/:volumeId
POST   /api/shelf/add
POST   /api/shelf/update
POST   /api/shelf/remove

GET    /api/logout
```

---

## 23. Comandos Git sugeridos

Depois de adicionar os arquivos ao projeto:

```bash
git add README.md DOCUMENTACAO.md
git commit -m "docs: adiciona README e documentação técnica"
git push
```
