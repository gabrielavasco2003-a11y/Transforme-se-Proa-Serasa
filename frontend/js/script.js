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

const IMG_FALLBACK = '/img/sem-capa.jpg';

// Helper: cria o HTML de um card de livro
function criarCardLivro(item) {
    const rating = item.averageRating || 0;
    const estrelas = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    // Se thumbnail for vazio/undefined, usa o fallback DIRETO (sem onerror)
    const capa = (item.thumbnail && item.thumbnail.trim()) ? item.thumbnail : IMG_FALLBACK;

    const livro = document.createElement('article');
    livro.innerHTML = `
        <img src="${capa}" alt="${item.title || 'Livro'}">
        <p class="titulo">${item.title || 'Sem título'}</p>
        <p class="estrelas">${estrelas}</p>
        <p class="avaliacoes">${item.ratingsCount ? item.ratingsCount + ' avaliações' : 'Sem avaliações'}</p>
    `;
    return livro;
}

// Função para carregar livros "Em Alta" (via BACKEND)
async function carregarEmAlta() {
    const livrosDiv = document.querySelector('section.livros-section:nth-of-type(1) .livros');
    if (!livrosDiv) return;
    livrosDiv.innerHTML = '<p class="carregando">Carregando...</p>';

    try {
        const response = await fetch('/api/books/em-alta');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        livrosDiv.innerHTML = '';
        if (!data.items || data.items.length === 0) {
            livrosDiv.innerHTML = '<p class="vazio">Nenhum livro encontrado.</p>';
            return;
        }

        data.items.forEach(item => {
            livrosDiv.appendChild(criarCardLivro(item));
        });
    } catch (err) {
        console.error('Erro ao carregar "Em Alta":', err);
        livrosDiv.innerHTML = '<p class="erro">Não foi possível carregar os livros.</p>';
    }
}

// Função para carregar livros "Prêmio Jabuti"
async function carregarJabuti() {
    const livrosDiv = document.querySelector('section.livros-section:nth-of-type(2) .livros');
    if (!livrosDiv) return;
    livrosDiv.innerHTML = '<p class="carregando">Carregando...</p>';

    try {
        const response = await fetch('/data/jabuti.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        livrosDiv.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            livrosDiv.innerHTML = '<p class="vazio">Nenhum livro encontrado.</p>';
            return;
        }

        data.forEach(item => {
            // Se capa for vazio/undefined, usa o fallback DIRETO (sem onerror)
            const capa = (item.capa && item.capa.trim()) ? item.capa : IMG_FALLBACK;
            const livro = document.createElement('article');
            livro.innerHTML = `
                <img src="${capa}" alt="${item.titulo || 'Livro'}">
                <p class="titulo">${item.titulo || 'Sem título'}</p>
                <p class="estrelas">${item.estrelas || ''}</p>
            `;
            livrosDiv.appendChild(livro);
        });
    } catch (err) {
        console.error('Erro ao carregar Jabuti:', err);
        livrosDiv.innerHTML = '<p class="erro">Não foi possível carregar os livros.</p>';
    }
}

// Função para carregar livros "Novos" (via BACKEND)
async function carregarNovos() {
    const livrosDiv = document.querySelector('section.livros-section:nth-of-type(3) .livros');
    if (!livrosDiv) return;
    livrosDiv.innerHTML = '<p class="carregando">Carregando...</p>';

    try {
        const response = await fetch('/api/books/novos');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        livrosDiv.innerHTML = '';
        if (!data.items || data.items.length === 0) {
            livrosDiv.innerHTML = '<p class="vazio">Nenhum livro encontrado.</p>';
            return;
        }

        data.items.forEach(item => {
            livrosDiv.appendChild(criarCardLivro(item));
        });
    } catch (err) {
        console.error('Erro ao carregar "Novos":', err);
        livrosDiv.innerHTML = '<p class="erro">Não foi possível carregar os livros.</p>';
    }
}

// Chamadas iniciais (com fallback silencioso — não quebra a página se uma falhar)
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
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    if (userMenu && !userMenu.contains(e.target)) {
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