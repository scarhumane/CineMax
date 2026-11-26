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

const pageParams = new URLSearchParams(window.location.search);
const loginError = document.getElementById("login-error");

if (loginError) {
    // Lets the "\n" in the message below start a new line.
    loginError.style.whiteSpace = "pre-line";

    if (pageParams.get("error") === "invalid") {
        loginError.textContent =
            "Account not found or incorrect password.\nPlease check your details or sign up.";
    } else if (pageParams.get("error") === "session_expired") {
        loginError.textContent =
            "Your session expired.\nPlease log in to continue.";
    }
}

// Shown after Confirm Payment sends the user here (?subscription=success)
if (pageParams.get("subscription") === "success") {
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        const note = document.createElement("p");

        note.className = "login-success";
        note.setAttribute("role", "status");
        note.textContent =
            "Your plan is active. Log in to start watching.";

        note.style.cssText =
            "margin:0 0 20px;padding:12px 14px;" +
            "border:1px solid rgba(92,195,220,0.45);border-radius:8px;" +
            "background:rgba(92,195,220,0.1);color:#d6e9f5;" +
            "font-size:14px;line-height:1.5;text-align:center;";

        loginForm.insertBefore(note, loginForm.firstChild);
    }
}