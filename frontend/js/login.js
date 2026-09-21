document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    if (email === "" || senha === "") {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        // ✅ URL alterada para o Render
        const response = await fetch("https://spoiler-esperado.onrender.com/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.mensagem);
            localStorage.setItem("usuarioLogado", JSON.stringify(data.usuario));
            window.location.href = "index.html";
        } else {
            alert(data.mensagem);
        }
    } catch (err) {
        console.error(err);
        alert("Erro ao tentar fazer login.");
    }
});