
document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signup-form");

    if (!signupForm) return;

    const passwordInput = document.getElementById("password");
    const confirmInput = document.getElementById("confirm_password");

    const strengthText = document.getElementById("strength-text");
    const strengthMeter = document.getElementById("strength-meter");
    const strengthSegments = document.querySelectorAll(".strength-segment");

    const confirmError = document.getElementById("confirm-password-error");
    const signupError = document.getElementById("signup-error");

    const requirements = {
        length: document.getElementById("req-length"),
        lowercase: document.getElementById("req-lowercase"),
        uppercase: document.getElementById("req-uppercase"),
        number: document.getElementById("req-number"),
        special: document.getElementById("req-special")
    };

    const toggleButtons = [
        {
            button: document.getElementById("toggle-password"),
            input: passwordInput
        },
        {
            button: document.getElementById("toggle-confirm-password"),
            input: confirmInput
        }
    ];

    let allRequirementsMet = false;

    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Password visibility
    toggleButtons.forEach(({ button, input }) => {
        if (!button || !input) return;

        button.addEventListener("click", () => {
            const isPassword = input.type === "password";

            input.type = isPassword ? "text" : "password";

            button.setAttribute("aria-pressed", String(isPassword));
            button.setAttribute(
                "aria-label",
                isPassword ? "Hide password" : "Show password"
            );

            const icon = button.querySelector("i");

            if (icon) {
                icon.setAttribute(
                    "data-lucide",
                    isPassword ? "eye" : "eye-off"
                );

                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        });
    });

    // Check password requirements
    function checkPassword(password) {
        return {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%]/.test(password)
        };
    }

    // Update requirement appearance
    function updateRequirement(element, isValid) {
        if (!element) return;

        element.classList.toggle("valid", isValid);
        element.setAttribute("aria-label", isValid ? "Requirement met" : "Requirement not met");
    }

    // Update strength preview
    function updatePasswordStrength() {
        const password = passwordInput.value;
        const results = checkPassword(password);

        const passedCount = Object.values(results).filter(Boolean).length;

        allRequirementsMet = passedCount === 5;

        updateRequirement(requirements.length, results.length);
        updateRequirement(requirements.lowercase, results.lowercase);
        updateRequirement(requirements.uppercase, results.uppercase);
        updateRequirement(requirements.number, results.number);
        updateRequirement(requirements.special, results.special);

        strengthSegments.forEach((segment, index) => {
            segment.classList.toggle("filled", index < passedCount);
            segment.classList.toggle("complete", allRequirementsMet);
        });

        strengthMeter.setAttribute("aria-valuenow", String(passedCount));

        if (password.length === 0) {
            strengthText.textContent = "Not entered";
            strengthMeter.setAttribute("aria-valuenow", "0");
        } else if (passedCount <= 2) {
            strengthText.textContent = "Weak";
        } else if (passedCount <= 4) {
            strengthText.textContent = "Moderate";
        } else {
            strengthText.textContent = "Strong";
        }

        checkPasswordMatch();
    }

    // Check if both password fields match
    function checkPasswordMatch() {
        const password = passwordInput.value;
        const confirmation = confirmInput.value;

        if (confirmation.length === 0) {
            confirmError.textContent = "";
            confirmInput.setCustomValidity("");
            return confirmation === "";
        }

        const matches = password === confirmation;

        confirmError.textContent = matches
            ? ""
            : "Passwords do not match.";

        confirmInput.setCustomValidity(
            matches ? "" : "Passwords do not match."
        );

        return matches;
    }

    // Live updates
    passwordInput.addEventListener("input", updatePasswordStrength);

    confirmInput.addEventListener("input", checkPasswordMatch);

    // Validate before submitting
    signupForm.addEventListener("submit", (event) => {
        updatePasswordStrength();

        const passwordsMatch = checkPasswordMatch();

        if (!allRequirementsMet) {
            event.preventDefault();

            signupError.textContent =
                "Please meet all five password requirements before creating your account.";

            passwordInput.focus();
            return;
        }

        if (!passwordsMatch) {
            event.preventDefault();

            signupError.textContent = "Please make sure both passwords match.";

            confirmInput.focus();
            return;
        }

        signupError.textContent = "";

        if (!signupForm.checkValidity()) {
            event.preventDefault();
            signupForm.reportValidity();
        }
    });

    // Clear general error when the user edits the password
    passwordInput.addEventListener("input", () => {
        signupError.textContent = "";
    });

    confirmInput.addEventListener("input", () => {
        signupError.textContent = "";
    });

    // Initial state
    updatePasswordStrength();
});
