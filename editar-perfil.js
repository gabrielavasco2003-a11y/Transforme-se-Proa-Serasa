// Botão alterar foto
document.getElementById('alterar-foto').addEventListener('click', () => {
    alert("Função de alteração de foto será implementada futuramente.");
});

// Captura do formulário
const formEditar = document.getElementById('form-editar');

formEditar.addEventListener('submit', (e) => {
    e.preventDefault();

    // Futuramente: integração com SQL/banco de dados
    alert("Alterações salvas (simulação).");
    window.location.href = "perfil.html"; // volta para perfil
});

// Botão excluir conta
document.getElementById('excluir-conta').addEventListener('click', () => {
    const confirmar = confirm("Tem certeza que deseja excluir sua conta?");
    if (confirmar) {
        alert("Conta excluída (simulação).");
        window.location.href = "index.html";
    }
});
