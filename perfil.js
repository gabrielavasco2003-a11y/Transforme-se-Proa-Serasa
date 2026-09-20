
// Botão editar perfil redireciona para página de edição
document.getElementById('editar-perfil').addEventListener('click', () => {
    window.location.href = "editar-perfil.html";
});


// Botão excluir conta
document.getElementById('excluir-conta').addEventListener('click', () => {
    const confirmar = confirm("Tem certeza que deseja excluir sua conta?");
    if (confirmar) {
        alert("Conta excluída (simulação).");
    }
});

// Botão logout
document.getElementById('logout').addEventListener('click', () => {
    alert("Você saiu da conta.");
    window.location.href = "index.html"; // redireciona para página inicial
});

// Botão ver mais na estante
document.getElementById('ver-mais').addEventListener('click', () => {
    window.location.href = "estante.html"; // futura página da estante
});
