
const $ = id => document.getElementById(id);

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

/* HELPERS */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatRating(rating) {
    const value = Number(rating || 0);

    return Number.isFinite(value)
        ? value.toFixed(1)
        : "N/A";
}

function loadingHTML(message) {
    return `<p class="no-results">${escapeHTML(message)}</p>`;
}

function refreshIcons() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

/* GENRE LOOKUP */

let genres = [];
let selectedGenre = null;

const movieIndex = new Map();

function register(movies) {
    movies.forEach(movie => {
        if (movie && movie.id) {
            movieIndex.set(String(movie.id), movie);
        }
    });

    return movies;
}

function getMovie(id) {
    return movieIndex.get(String(id));
}

/* LOCAL MOVIE CATALOG */

async function fetchCatalog(type, {
    query = "",
    genre = ""
} = {}) {
    const response = await fetch("../06 - Admin/admin_movies_api.php", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
    });
    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("The local movie catalog returned an invalid response.");
    }

    if (!response.ok || !Array.isArray(data.movies)) {
        throw new Error(data.error || "Unable to load the local movie catalog.");
    }

    const movies = data.movies.map(normalizeLocalMovie).filter(Boolean);
    if (type === "genres") {
        const names = [...new Set(movies.flatMap(movie => movie.genres))]
            .sort((a, b) => a.localeCompare(b));
        return {
            genres: names.map(name => ({ id: name, name }))
        };
    }

    const filtered = movies.filter(movie => {
        if (type === "discover" && !movie.genres.some(name =>
            name.toLowerCase() === String(genre).toLowerCase()
        )) return false;
        if (type === "search" && ![
            movie.title,
            movie.description,
            movie.director,
            ...movie.genres
        ].join(" ").toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    });

    return { results: filtered };
}

/* LOCAL MOVIE NORMALIZATION */

function normalizeLocalMovie(movie) {
    if (!movie || !movie.id) {
        return null;
    }

    return {
        ...movie,
        id: String(movie.id),
        title: movie.title || "Untitled",
        year: movie.year || "N/A",
        rating: Number(movie.rating || 0),
        genres: Array.isArray(movie.genres) ? movie.genres : [],
        director: movie.director || "",
        cast: Array.isArray(movie.cast) ? movie.cast : [],
        poster: movie.poster || "",
        backdrop: movie.backdrop || "",
        backdropSmall: movie.backdrop || movie.poster || "",
        description: movie.description || "No description available."
    };
}

/* MOVIE POSTERS */

function createPoster(movie) {
    const content = movie.poster
        ? `
            <img
                src="${escapeHTML(movie.poster)}"
                alt="${escapeHTML(movie.title)} poster"
                loading="lazy"
            >
        `
        : `
            <div class="poster-placeholder">
                ${escapeHTML(movie.title)}
            </div>
        `;

    return `<div class="movie-poster">${content}</div>`;
}

/* MOVIE CARDS */

function createMovieCard(movie) {
    return `
        <article class="movie-card">

            <a
                href="#"
                class="movie-open"
                data-open-movie="${escapeHTML(movie.id)}"
            >

                ${createPoster(movie)}

                <div class="movie-info">

                    <h3>${escapeHTML(movie.title)}</h3>

                    <p class="movie-meta">
                        ${escapeHTML(movie.year)}
                        ·
                        ${escapeHTML(
                            (movie.genres || [])
                                .slice(0, 2)
                                .join(", ")
                        )}
                    </p>

                    <p class="movie-rating">
                        ★ ${formatRating(movie.rating)}
                    </p>

                </div>

            </a>

        </article>
    `;
}

/* RESULTS DISPLAY */

function renderMovieResults(movies, description) {
    if (!resultsContainer) return;

    if (!movies.length) {
        resultsContainer.innerHTML = loadingHTML(
            description.noResults
        );

        return;
    }

    resultsContainer.innerHTML = `
        <p class="search-results-count">
            ${movies.length} movies found ${description.countText}
        </p>

        ${movies.map(createMovieCard).join("")}
    `;
}

/* IMAGE FALLBACKS */

document.addEventListener("error", event => {
    const image = event.target;

    if (
        image.tagName !== "IMG" ||
        !image.closest(".movie-poster")
    ) {
        return;
    }

    const placeholder = document.createElement("div");

    placeholder.className = "poster-placeholder";
    placeholder.textContent = image.alt.replace(/ poster$/, "");

    image.replaceWith(placeholder);
}, true);

/* PAGE ELEMENTS */

const genreList = $("genres-list");
const genreSearch = $("genre-search");
const resultsSection = $("genre-results-section");
const resultsContainer = $("genre-movies");
const resultsTitle = $("genre-results-title");
const backButton = $("back-to-genres");

function showGenreBrowser() {
    if (genreList) {
        genreList.hidden = false;
    }

    if (resultsSection) {
        resultsSection.hidden = true;
    }
}

function showMovieResults() {
    if (genreList) {
        genreList.hidden = true;
    }

    if (resultsSection) {
        resultsSection.hidden = false;
    }
}

/* GENRE CARDS */

function renderGenres() {
    const container = genreList;

    if (!container) return;

    if (!genres.length) {
        container.innerHTML = loadingHTML(
            "No genres are available yet. Add genre details to movies in the CineMax catalog."
        );

        return;
    }

    container.innerHTML = genres.map(genre => `
        <button
            type="button"
            class="genre-card"
            data-genre="${escapeHTML(genre.id)}"
            aria-pressed="false"
        >
            ${escapeHTML(genre.name)}
        </button>
    `).join("");
}

/* LOAD GENRES */

async function loadGenres() {
    if (!genreList) return;

    genreList.innerHTML = loadingHTML(
        "Loading movie genres..."
    );

    try {
        const data = await fetchCatalog("genres");

        genres = data.genres || [];

        renderGenres();

    } catch (error) {
        console.error("Genre loading error:", error);
        genreList.innerHTML = loadingHTML(
            `Unable to load the local movie catalog: ${error.message}`
        );
    }
}

/* REQUEST TRACKING */

let movieRequestNumber = 0;
let searchRequestNumber = 0;
let searchTimer = null;

/* GENRE MOVIES */

async function showGenre(genreId) {
    const genre = genres.find(item => String(item.id) === String(genreId));

    if (!genre) return;

    clearTimeout(searchTimer);

    searchRequestNumber++;
    movieRequestNumber++;

    const current = movieRequestNumber;

    selectedGenre = genre.id;

    if (genreSearch) {
        genreSearch.value = "";
    }

    if (resultsTitle) {
        resultsTitle.textContent = `${genre.name} Movies`;
    }

    if (resultsContainer) {
        resultsContainer.innerHTML = loadingHTML(
            `Loading ${genre.name} movies...`
        );
    }

    showMovieResults();

    if (resultsSection) {
        resultsSection.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "start"
        });
    }

    try {
        const data = await fetchCatalog("discover", { genre: genre.name });

        if (current !== movieRequestNumber) return;

        const movies = register(
            (data.results || [])
                .map(normalizeLocalMovie)
                .filter(Boolean)
        );

        renderMovieResults(movies, {
            countText: `in ${genre.name}`,
            noResults: `No ${genre.name} movies were found.`
        });

    } catch (error) {
        if (current !== movieRequestNumber) return;

        console.error("Genre movie loading error:", error);

        if (resultsContainer) {
            resultsContainer.innerHTML = loadingHTML(
                "Unable to load movies. Please try again."
            );
        }
    }
}

/* MOVIE SEARCH */

async function searchGenreMovies(query) {
    const term = query.trim();

    if (!term) {
        searchRequestNumber++;
        movieRequestNumber++;

        selectedGenre = null;

        showGenreBrowser();

        return;
    }

    selectedGenre = null;

    const current = ++searchRequestNumber;

    movieRequestNumber++;

    if (resultsTitle) {
        resultsTitle.textContent = "Search Results";
    }

    if (resultsContainer) {
        resultsContainer.innerHTML = loadingHTML(
            "Searching movies..."
        );
    }

    showMovieResults();

    try {
        const data = await fetchCatalog("search", { query: term });

        if (current !== searchRequestNumber) return;

        const movies = register(
            (data.results || [])
                .map(normalizeLocalMovie)
                .filter(Boolean)
        );

        renderMovieResults(movies, {
            countText: `for "${escapeHTML(term)}"`,
            noResults: `No movies found for "${term}".`
        });

    } catch (error) {
        if (current !== searchRequestNumber) return;

        console.error("Genre movie search error:", error);

        if (resultsContainer) {
            resultsContainer.innerHTML = loadingHTML(
                "Unable to search movies right now."
            );
        }
    }
}

/* SEARCH INPUT */

if (genreSearch) {
    genreSearch.addEventListener("input", () => {
        clearTimeout(searchTimer);

        const query = genreSearch.value.trim();

        if (!query) {
            searchGenreMovies("");
            return;
        }

        searchTimer = setTimeout(() => {
            searchGenreMovies(query);
        }, 350);
    });
}

/* BACK TO GENRES */

if (backButton) {
    backButton.addEventListener("click", () => {
        clearTimeout(searchTimer);

        searchRequestNumber++;
        movieRequestNumber++;

        selectedGenre = null;

        if (genreSearch) {
            genreSearch.value = "";
        }

        if (resultsContainer) {
            resultsContainer.innerHTML = "";
        }

        showGenreBrowser();

        if (genreList) {
            genreList.scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
                block: "start"
            });
        }
    });
}

/* MOVIE DETAILS MODAL */

let lastFocused = null;

function getModal() {
    return $("movie-modal");
}

function showModal() {
    const modal = getModal();

    if (!modal) return;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    const closeButton = modal.querySelector(".modal-close");

    if (closeButton) {
        closeButton.focus();
    }

    refreshIcons();
}

function openModal(movie) {
    const modal = getModal();

    if (!modal || !movie) return;

    lastFocused = document.activeElement;

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");
    const closeButton = modal.querySelector(".modal-close");

    if (!media || !body || !closeButton) return;

    media.innerHTML = createPoster(movie);

    body.innerHTML = `
        <p class="hero-label">Movie details</p>

        <h2 id="modal-title">
            ${escapeHTML(movie.title)}
        </h2>

        <p class="modal-meta">
            ${escapeHTML(movie.year)}
            ·
            <span class="modal-rating">
                ★ ${formatRating(movie.rating)}
            </span>
        </p>

        <div class="modal-tags">
            ${(movie.genres || []).map(genre => `
                <span class="tag">
                    ${escapeHTML(genre)}
                </span>
            `).join("")}
        </div>

        <p class="modal-description">
            ${escapeHTML(movie.description)}
        </p>
        ${getYouTubeEmbedURL(movie.youtube_url) ? `
            <div class="modal-actions">
                <button type="button" class="modal-trailer" data-play-movie>
                    <i data-lucide="play"></i>
                    Play movie
                </button>
            </div>
        ` : ""}
    `;

    body.querySelector("[data-play-movie]")?.addEventListener("click", () => {
        const embedURL = getYouTubeEmbedURL(movie.youtube_url);
        if (!embedURL) return;
        media.innerHTML = `
            <iframe
                class="modal-video"
                src="${escapeHTML(embedURL)}?autoplay=1"
                title="Play ${escapeHTML(movie.title)}"
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen>
            </iframe>
        `;
    });

    showModal();
}

function getYouTubeEmbedURL(value) {
    if (typeof value !== "string") return "";

    try {
        const url = new URL(value);
        const match = url.protocol === "https:"
            && url.hostname === "www.youtube-nocookie.com"
            ? url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})$/)
            : null;
        return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : "";
    } catch {
        return "";
    }
}

function closeModal() {
    const modal = getModal();

    if (!modal || modal.hidden) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.querySelector(".modal-media").innerHTML = "";

    document.body.classList.remove("modal-open");

    if (
        lastFocused &&
        typeof lastFocused.focus === "function"
    ) {
        lastFocused.focus();
    }
}

/* CLICK EVENTS */

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const target = event.target;

    const genreButton = target.closest("[data-genre]");

    if (genreButton) {
        showGenre(genreButton.dataset.genre);
        return;
    }

    const movieButton = target.closest("[data-open-movie]");

    if (movieButton) {
        event.preventDefault();

        openModal(
            getMovie(movieButton.dataset.openMovie)
        );

        return;
    }

    if (target.closest("[data-close-modal]")) {
        closeModal();
    }
});

/* KEYBOARD EVENTS */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal();
        return;
    }

    const modal = getModal();

    if (
        event.key !== "Tab" ||
        !modal ||
        modal.hidden
    ) {
        return;
    }

    const focusable = [
        ...modal.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
    ];

    if (!focusable.length) {
        event.preventDefault();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (
        event.shiftKey &&
        document.activeElement === first
    ) {
        event.preventDefault();
        last.focus();

    } else if (
        !event.shiftKey &&
        document.activeElement === last
    ) {
        event.preventDefault();
        first.focus();
    }
});

/* INITIALIZE */

showGenreBrowser();
loadGenres();
refreshIcons();
