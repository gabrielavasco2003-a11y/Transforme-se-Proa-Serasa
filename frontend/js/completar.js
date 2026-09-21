document.getElementById("completarForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const telefone = document.querySelector("[name='telefone']").value;
  const nascimento = document.querySelector("[name='nascimento']").value;
  const senha = document.querySelector("[name='senha']").value;

  try {
    // ✅ Caminho relativo + envio de credenciais de sessão
    const response = await fetch("/api/completar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 👈 Essencial para manter o usuário logado via sessão
      body: JSON.stringify({ telefone, nascimento, senhaHash: senha })
    });

    const data = await response.json();
    alert(data.mensagem);

    if (response.ok) {
      window.location.href = "/perfil.html";
    }
  } catch (err) {
    console.error(err);
    alert("Erro ao completar cadastro.");
  }
});