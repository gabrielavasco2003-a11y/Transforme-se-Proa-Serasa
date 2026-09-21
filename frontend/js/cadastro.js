// Cadastro normal
document.getElementById("cadastroForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const nome = document.querySelector("[name='nome']").value;
    const usuario = document.querySelector("[name='usuario']").value;
    const email = document.querySelector("[name='email']").value;
    const confirmarEmail = document.querySelector("[name='confirmarEmail']").value;
    const senha = document.querySelector("[name='senha']").value;
    const confirmarSenha = document.querySelector("[name='confirmarSenha']").value;
    const telefone = document.querySelector("[name='telefone']").value;
    const nascimento = document.querySelector("[name='nascimento']").value;

    if (email !== confirmarEmail) {
        alert("Os e-mails não coincidem!");
        return;
    }
    if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    try {
        // ✅ URL alterada para o Render
        const response = await fetch("https://spoiler-esperado.onrender.com/api/cadastro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome,
                usuario,
                email,
                senhaHash: senha,
                telefone,
                nascimento
            })
        });

        const data = await response.json();
        alert(data.mensagem);

        if (response.ok) {
            window.location.href = "perfil.html";
        }
    } catch (err) {
        console.error(err);
        alert("Erro ao cadastrar usuário.");
    }
});

// Login com Google
function loginGoogle() {
    // ✅ URL alterada para o Render
    window.location.href = "https://spoiler-esperado.onrender.com/api/google";
}