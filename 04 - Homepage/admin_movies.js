const adminMovieForm = document.getElementById("admin-movie-form");
const adminMovieList = document.getElementById("admin-movie-list");
const adminStatus = document.getElementById("admin-status");
const adminCsrfToken = document.querySelector(".admin-page")?.dataset.csrfToken || "";

function escapeAdminHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

async function requestAdminMovies(method = "GET", payload = null) {
    const options = {
        method,
        headers: { Accept: "application/json" }
    };

    if (payload) {
        options.headers["Content-Type"] = "application/json";
        options.headers["X-CSRF-Token"] = adminCsrfToken;
        options.body = JSON.stringify(payload);
    }

    const response = await fetch("admin_movies_api.php", options);
    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to update the movie collection.");
    }

    return data;
}

function renderAdminMovies(movies) {
    if (!movies.length) {
        adminMovieList.innerHTML = '<p class="modal-muted">No movies have been added yet.</p>';
        return;
    }

    adminMovieList.innerHTML = movies.map(movie => `
        <article class="admin-movie-row">
            <div>
                <h3>${escapeAdminHTML(movie.title)}</h3>
                <p>
                    Catalog ID ${escapeAdminHTML(movie.id)}
                    ${movie.year ? ` · ${escapeAdminHTML(movie.year)}` : ""}
                    ${Array.isArray(movie.genres) && movie.genres.length ? ` · ${escapeAdminHTML(movie.genres.join(", "))}` : ""}
                </p>
            </div>
            <button
                type="button"
                class="admin-remove-button"
                data-remove-admin-movie="${escapeAdminHTML(movie.id)}">
                Remove
            </button>
        </article>
    `).join("");
}

async function loadAdminMovies() {
    adminMovieList.innerHTML = '<p class="modal-muted">Loading movies...</p>';

    try {
        const data = await requestAdminMovies();
        renderAdminMovies(data.movies);
    } catch (error) {
        adminMovieList.innerHTML = `<p class="admin-error">${escapeAdminHTML(error.message)}</p>`;
    }
}

adminMovieForm.addEventListener("submit", async event => {
    event.preventDefault();
    adminStatus.textContent = "";

    const formData = new FormData(adminMovieForm);
    const payload = Object.fromEntries(formData.entries());

    try {
        const data = await requestAdminMovies("POST", payload);
        renderAdminMovies(data.movies);
        adminMovieForm.reset();
        adminStatus.textContent = "Movie added to the CineMax Collection.";
    } catch (error) {
        adminStatus.textContent = error.message;
    }
});

adminMovieList.addEventListener("click", async event => {
    const button = event.target.closest("[data-remove-admin-movie]");

    if (!button || button.disabled) return;

    button.disabled = true;
    adminStatus.textContent = "";

    try {
        const data = await requestAdminMovies("DELETE", {
            id: button.dataset.removeAdminMovie
        });
        renderAdminMovies(data.movies);
        adminStatus.textContent = "Movie removed from the CineMax Collection.";
    } catch (error) {
        adminStatus.textContent = error.message;
        button.disabled = false;
    }
});

loadAdminMovies();
