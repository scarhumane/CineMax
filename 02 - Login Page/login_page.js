if (typeof lucide !== "undefined") {
    lucide.createIcons();
}

function setupPasswordToggle(inputId, buttonId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = document.getElementById(buttonId);

    if (!passwordInput || !toggleButton) return;

    toggleButton.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden ? "text" : "password";

        toggleButton.innerHTML = isHidden
            ? '<i data-lucide="eye"></i>'
            : '<i data-lucide="eye-off"></i>';

        toggleButton.setAttribute("aria-label",
            isHidden ? "Hide password" : "Show password");

        toggleButton.setAttribute("aria-pressed", String(isHidden));

        lucide.createIcons();
    });
}

setupPasswordToggle("password", "toggle-password");
setupPasswordToggle("confirm_password", "toggle-confirm-password");