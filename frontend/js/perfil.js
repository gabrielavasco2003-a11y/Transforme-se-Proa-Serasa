// Recupera dados do usuário logado
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

if (usuarioLogado) {
    document.getElementById("nomePerfil").textContent = usuarioLogado.nome;
    document.getElementById("emailPerfil").textContent = usuarioLogado.email;
    document.getElementById("usuarioPerfil").textContent = usuarioLogado.usuario;
} else {
    alert("Nenhum usuário logado.");
    window.location.href = "index.html";
}

// Botão editar perfil
document.getElementById('editar-perfil').addEventListener('click', () => {
    window.location.href = "editar-perfil.html";
});

// Botão excluir conta
document.getElementById('excluir-conta').addEventListener('click', async () => {
    const confirmar = confirm("Tem certeza que deseja excluir sua conta?");
    if (confirmar && usuarioLogado) {
        try {
            // ✅ URL atualizada para o backend no Render
            const response = await fetch("https://spoiler-esperado.onrender.com/api/excluir", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: usuarioLogado.email })
            });
            const data = await response.json();
            alert(data.mensagem);
            localStorage.removeItem("usuarioLogado");
            window.location.href = "index.html";
        } catch (err) {
            alert("Erro ao excluir conta.");
        }
    }
});

// Botão logout
document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem("usuarioLogado");
    alert("Você saiu da conta.");
    window.location.href = "index.html";
});

// Botão ver mais na estante
document.getElementById('ver-mais').addEventListener('click', () => {
    window.location.href = "estante.html";
});