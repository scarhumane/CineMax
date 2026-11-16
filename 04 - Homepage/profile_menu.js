document.addEventListener("DOMContentLoaded", () => {

    const profileMenu = document.querySelector(".profile-menu");
    const profileTrigger = document.getElementById("profile-trigger");
    const profileDropdown = document.getElementById("profile-dropdown");

    if (!profileMenu || !profileTrigger || !profileDropdown) {
        return;
    }

    function setProfileMenuOpen(isOpen) {

        profileMenu.classList.toggle("open", isOpen);

        profileTrigger.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        profileDropdown.hidden = !isOpen;
    }

    // Open and close when the profile button is clicked.
    profileTrigger.addEventListener("click", () => {

        const isOpen = profileMenu.classList.contains("open");

        setProfileMenuOpen(!isOpen);

    });

    // Close when clicking outside the profile menu.
    document.addEventListener("click", event => {

        if (!profileMenu.contains(event.target)) {
            setProfileMenuOpen(false);
        }

    });

    // Close when pressing Escape.
    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            setProfileMenuOpen(false);
        }

    });

});
