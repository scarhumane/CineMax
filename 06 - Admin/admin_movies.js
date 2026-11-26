const adminMovieForm = document.getElementById("admin-movie-form");
const adminMovieList = document.getElementById("admin-movie-list");
const adminStatus = document.getElementById("admin-status");
const addMoviePanel = document.getElementById("add-movie-panel");
const adminCatalogPanel = document.getElementById("admin-catalog-panel");
const showAddMovieButton = document.getElementById("show-add-movie-button");
const showAddMovieIcon = document.getElementById("show-add-movie-icon");
const showAddMovieLabel = document.getElementById("show-add-movie-label");
const cancelAddMovieButton = document.getElementById("cancel-add-movie-button");
const tmdbSearchForm = document.getElementById("tmdb-search-form");
const tmdbSearchQuery = document.getElementById("tmdb-search-query");
const tmdbSearchButton = document.getElementById("tmdb-search-button");
const tmdbSearchStatus = document.getElementById("tmdb-search-status");
const tmdbSearchResults = document.getElementById("tmdb-search-results");
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
        throw new Error(data.error || "Unable to update the movie catalog.");
    }

    return data;
}

async function requestTmdb(payload) {
    const response = await fetch("tmdb_movies.php", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": adminCsrfToken
        },
        body: JSON.stringify(payload)
    });
    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("TMDB returned an invalid response.");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load movies from TMDB.");
    }

    return data;
}

function renderTmdbResults(results) {
    if (!results.length) {
        tmdbSearchResults.innerHTML = '<p class="modal-muted">No matching movies found.</p>';
        return;
    }

    tmdbSearchResults.innerHTML = results.map(movie => `
        <article class="tmdb-result">
            ${movie.poster
                ? `<img src="${escapeAdminHTML(movie.poster)}" alt="" loading="lazy">`
                : '<div class="tmdb-result-poster" aria-hidden="true"></div>'}
            <div class="tmdb-result-info">
                <h4>${escapeAdminHTML(movie.title)}</h4>
                <p>${escapeAdminHTML(movie.year || "Release year unavailable")}</p>
                <p>${escapeAdminHTML(movie.overview || "No synopsis provided by TMDB.")}</p>
            </div>
            <button
                type="button"
                class="admin-submit-button tmdb-use-button"
                data-use-tmdb-movie="${escapeAdminHTML(movie.id)}">
                Use details
            </button>
        </article>
    `).join("");
}

function renderAdminMovies(movies) {
    if (!movies.length) {
        adminMovieList.innerHTML = `
            <p class="modal-muted admin-empty-state">
                No movies have been added yet.
            </p>
        `;
        return;
    }

    adminMovieList.innerHTML = `
        <div class="admin-table-scroll">
            <table class="admin-movie-table">
                <thead>
                    <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Title</th>
                        <th scope="col">Year</th>
                        <th scope="col">Genre</th>
                        <th scope="col">Director</th>
                        <th scope="col">Average Rating</th>
                        <th scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${movies.map((movie, index) => {
                        const genres = Array.isArray(movie.genres)
                            ? movie.genres.join(", ")
                            : "";
                        const rating = Number(movie.rating);

                        return `
                            <tr>
                                <td class="admin-table-id">#${index + 1}</td>
                                <th scope="row" class="admin-table-title">
                                    ${escapeAdminHTML(movie.title)}
                                </th>
                                <td>${escapeAdminHTML(movie.year || "—")}</td>
                                <td>${escapeAdminHTML(genres || "—")}</td>
                                <td>${escapeAdminHTML(movie.director || "—")}</td>
                                <td class="admin-table-rating">
                                    ${Number.isFinite(rating) && rating > 0
                                        ? `${rating.toFixed(1)}${movie.rating_count ? ` (${escapeAdminHTML(movie.rating_count)})` : ""}`
                                        : "—"}
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        class="admin-remove-button"
                                        data-remove-admin-movie="${escapeAdminHTML(movie.id)}"
                                        aria-label="Remove ${escapeAdminHTML(movie.title)}">
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function setAddMoviePanelOpen(isOpen) {
    addMoviePanel.hidden = !isOpen;
    adminCatalogPanel.hidden = isOpen;
    showAddMovieIcon.hidden = isOpen;
    showAddMovieButton.setAttribute("aria-expanded", String(isOpen));
        showAddMovieLabel.textContent = isOpen ? "Movie Catalog" : "Add Movie";

    if (isOpen) {
        adminStatus.textContent = "";
        adminMovieForm.elements.title.focus();
    } else {
        showAddMovieButton.focus();
    }
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
        await requestAdminMovies("POST", payload);
        adminMovieForm.reset();
        await loadAdminMovies();
        setAddMoviePanelOpen(false);
        adminStatus.textContent = "Movie added to the CineMax catalog.";
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
        await requestAdminMovies("DELETE", {
            id: button.dataset.removeAdminMovie
        });
        await loadAdminMovies();
        adminStatus.textContent = "Movie removed from the CineMax catalog.";
    } catch (error) {
        adminStatus.textContent = error.message;
        button.disabled = false;
    }
});

loadAdminMovies();

showAddMovieButton.addEventListener("click", () => {
    setAddMoviePanelOpen(addMoviePanel.hidden);
});

cancelAddMovieButton.addEventListener("click", () => {
    adminMovieForm.reset();
    adminStatus.textContent = "";
    setAddMoviePanelOpen(false);
});

tmdbSearchForm.addEventListener("submit", async event => {
    event.preventDefault();
    const query = tmdbSearchQuery.value.trim();

    tmdbSearchStatus.textContent = "";
    tmdbSearchResults.replaceChildren();
    if (!query) {
        tmdbSearchStatus.textContent = "Enter a movie title to search TMDB.";
        tmdbSearchQuery.focus();
        return;
    }

    tmdbSearchButton.disabled = true;
    tmdbSearchButton.textContent = "Searching...";
    tmdbSearchResults.innerHTML = '<p class="modal-muted">Searching TMDB...</p>';

    try {
        const data = await requestTmdb({ action: "search", query });
        renderTmdbResults(data.results);
    } catch (error) {
        tmdbSearchResults.replaceChildren();
        tmdbSearchStatus.textContent = error.message;
    } finally {
        tmdbSearchButton.disabled = false;
        tmdbSearchButton.textContent = "Search TMDB";
    }
});

tmdbSearchResults.addEventListener("click", async event => {
    const button = event.target.closest("[data-use-tmdb-movie]");
    if (!button || button.disabled) return;

    button.disabled = true;
    button.textContent = "Loading details...";
    tmdbSearchStatus.textContent = "";

    try {
        const data = await requestTmdb({
            action: "details",
            tmdb_id: button.dataset.useTmdbMovie
        });
        const movie = data.movie;

        adminMovieForm.elements.id.value = movie.id;
        adminMovieForm.elements.title.value = movie.title;
        adminMovieForm.elements.year.value = movie.year;
        adminMovieForm.elements.genres.value = movie.genres;
        adminMovieForm.elements.poster.value = movie.poster;
        adminMovieForm.elements.backdrop.value = movie.backdrop;
        adminMovieForm.elements.director.value = movie.director;
        adminMovieForm.elements.director_photo.value = movie.director_photo;
        adminMovieForm.elements.cast.value = movie.cast
            .map(person => person.photo
                ? `${person.name} | ${person.photo}`
                : person.name)
            .join("\n");
        adminMovieForm.elements.description.value = movie.description;

        adminStatus.textContent = "TMDB details loaded. Add a YouTube trailer link if available, then add the movie to the catalog.";
        tmdbSearchStatus.textContent = "Details loaded into the movie form.";
        adminMovieForm.elements.youtube_url.focus();
    } catch (error) {
        tmdbSearchStatus.textContent = error.message;
    } finally {
        button.disabled = false;
        button.textContent = "Use details";
    }
});
