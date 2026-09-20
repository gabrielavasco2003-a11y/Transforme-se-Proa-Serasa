// Controle das setas para rolagem
document.querySelectorAll('.arrow').forEach(arrow => {
    arrow.addEventListener('click', () => {
        const livros = arrow.parentElement.querySelector('.livros');
        const scrollAmount = 200;
        if (arrow.classList.contains('left')) {
            livros.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            livros.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    });
});

// Função para carregar livros "Em Alta"
async function carregarEmAlta() {
    const response = await fetch('https://www.googleapis.com/books/v1/volumes?q=best+seller&maxResults=10&key=AIzaSyAu6edO3YMiflVEFdkxbZBRA9ECY-Nt31o');
    const data = await response.json();
    const livrosDiv = document.querySelector('section.livros-section:nth-of-type(1) .livros');
    livrosDiv.innerHTML = '';

    data.items.forEach(item => {
        const info = item.volumeInfo;
        const rating = info.averageRating || 0;
        const estrelas = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

        const livro = document.createElement('article');
        livro.innerHTML = `
            <img src="${info.imageLinks?.thumbnail || ''}" alt="${info.title}">
            <p class="titulo">${info.title}</p>
            <p class="estrelas">${estrelas}</p>
            <p class="avaliacoes">${info.ratingsCount ? info.ratingsCount + ' avaliações' : 'Sem avaliações'}</p>
        `;
        livrosDiv.appendChild(livro);
    });
}

// Função para carregar livros "Prêmio Jabuti"
async function carregarJabuti() {
    const response = await fetch('jabuti.json');
    const data = await response.json();
    const livrosDiv = document.querySelector('section.livros-section:nth-of-type(2) .livros');
    livrosDiv.innerHTML = '';
    data.forEach(item => {
        const livro = document.createElement('article');
        livro.innerHTML = `
            <img src="${item.capa}" alt="${item.titulo}">
            <p class="titulo">${item.titulo}</p>
            <p class="estrelas">${item.estrelas}</p>
        `;
        livrosDiv.appendChild(livro);
    });
}

// Função para carregar livros "Novos"
async function carregarNovos() {
    const response = await fetch('https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=newest&maxResults=10&key=AIzaSyAu6edO3YMiflVEFdkxbZBRA9ECY-Nt31o');
    const data = await response.json();
    const livrosDiv = document.querySelector('section.livros-section:nth-of-type(3) .livros');
    livrosDiv.innerHTML = '';

    data.items.forEach(item => {
        const info = item.volumeInfo;
        const rating = info.averageRating || 0;
        const estrelas = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

        const livro = document.createElement('article');
        livro.innerHTML = `
            <img src="${info.imageLinks?.thumbnail || ''}" alt="${info.title}">
            <p class="titulo">${info.title}</p>
            <p class="estrelas">${estrelas}</p>
            <p class="avaliacoes">${info.ratingsCount ? info.ratingsCount + ' avaliações' : 'Sem avaliações'}</p>
        `;
        livrosDiv.appendChild(livro);
    });
}

// Chamadas iniciais
carregarEmAlta();
carregarJabuti();
carregarNovos();

/* --- Controle do menu de usuário --- */
const avatar = document.getElementById('avatar');
const dropdown = document.getElementById('dropdown');
const nav = document.querySelector('nav');
const userMenu = document.getElementById('user-menu');
const logoutBtn = document.getElementById('logout');

// Simular login (esconde Cadastro/Login e mostra avatar)
function loginUsuario() {
    nav.style.display = 'none';
    userMenu.style.display = 'block';
}

// Alternar dropdown ao clicar no avatar
if (avatar) {
    avatar.addEventListener('click', (e) => {
        e.stopPropagation(); // evita fechar imediatamente
        dropdown.classList.toggle('hidden');
    });
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    if (!userMenu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        userMenu.style.display = 'none';
        nav.style.display = 'block';
        dropdown.classList.add('hidden');
    });
}
