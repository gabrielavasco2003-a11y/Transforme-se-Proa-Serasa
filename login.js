document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    // Exemplo simples de validação
    if (email === "" || senha === "") {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    // Aqui você pode integrar com seu backend ou API
    alert("Login realizado com sucesso!");
    window.location.href = "index.html"; // redireciona para o index
});