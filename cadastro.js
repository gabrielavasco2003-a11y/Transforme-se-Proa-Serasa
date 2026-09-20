document.getElementById("cadastroForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.querySelector("[name='email']").value;
    const confirmarEmail = document.querySelector("[name='confirmarEmail']").value;
    const senha = document.querySelector("[name='senha']").value;
    const confirmarSenha = document.querySelector("[name='confirmarSenha']").value;

    const termos = document.getElementById("termos").checked;
    const regras = document.getElementById("regras").checked;

    // Validações
    if (email !== confirmarEmail) {
        alert("Os e-mails não coincidem!");
        return;
    }

    if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    if (!termos || !regras) {
        alert("Você deve aceitar os Termos e as Regras da comunidade!");
        return;
    }

    alert("Cadastro realizado com sucesso!");
});
