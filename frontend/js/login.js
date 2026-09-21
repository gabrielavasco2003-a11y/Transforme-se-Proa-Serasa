document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    // Validação simples
    if (email === "" || senha === "") {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.mensagem);
            // Redireciona para a página inicial ou perfil
            window.location.href = "index.html";
        } else {
            alert(data.mensagem);
        }
    } catch (err) {
        console.error(err);
        alert("Erro ao tentar fazer login.");
    }
});
