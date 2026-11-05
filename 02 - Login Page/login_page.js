const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");

togglePassword.addEventListener("click", function () {
    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";

    togglePassword.innerHTML = isHidden
        ? '<i data-lucide="eye"></i>'
        : '<i data-lucide="eye-off"></i>';

    togglePassword.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password"
    );

    togglePassword.setAttribute(
        "aria-pressed",
        String(isHidden)
    );

    lucide.createIcons();
});

lucide.createIcons();