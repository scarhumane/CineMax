
const $ = id => document.getElementById(id);

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

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

const GENRE_NAMES = {};

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

/* TMDB */

async function fetchTMDB(type, {
    query = "",
    page = 1,
    genre = null
} = {}) {
    const parameters = new URLSearchParams({
        type,
        page: String(page)
    });

    if (query) {
        parameters.set("query", query);
    }

    if (genre !== null) {
        parameters.set("genre", String(genre));
    }

    const response = await fetch(
        `tmdb_movies.php?${parameters.toString()}`
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "The movie service returned an invalid response."
        );
    }

    if (!response.ok || !data || data.error) {
        throw new Error(
            data?.error || "Unable to fetch movie data."
        );
    }

    return data;
}

/* MOVIE NORMALIZATION */

function normalizeTMDBMovie(movie) {
    if (!movie || !movie.id) {
        return null;
    }

    const movieGenres = movie.genre_ids
        ? movie.genre_ids
            .map(id => GENRE_NAMES[id])
            .filter(Boolean)
        : (movie.genres || [])
            .map(genre => genre.name)
            .filter(Boolean);

    return {
        id: String(movie.id),

        title: movie.title ||
            movie.original_title ||
            "Untitled",

        year: movie.release_date
            ? Number(movie.release_date.slice(0, 4))
            : "N/A",

        rating: Number(movie.vote_average || 0),

        genres: movieGenres,

        director: "",
        cast: [],

        poster: movie.poster_path
            ? `${TMDB_IMAGE_BASE}w500${movie.poster_path}`
            : "",

        backdrop: movie.backdrop_path
            ? `${TMDB_IMAGE_BASE}original${movie.backdrop_path}`
            : "",

        backdropSmall: movie.backdrop_path
            ? `${TMDB_IMAGE_BASE}w780${movie.backdrop_path}`
            : "",

        description: movie.overview ||
            "No description available."
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
            "No genres are available right now."
        );

        return;
    }

    container.innerHTML = genres.map(genre => `
        <button
            type="button"
            class="genre-card"
            data-genre="${Number(genre.id)}"
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
        const data = await fetchTMDB("genres");

        genres = data.genres || [];

        Object.keys(GENRE_NAMES).forEach(id => {
            delete GENRE_NAMES[id];
        });

        genres.forEach(genre => {
            GENRE_NAMES[genre.id] = genre.name;
        });

        renderGenres();

    } catch (error) {
        console.error("Genre loading error:", error);

        genreList.innerHTML = loadingHTML(
            "Unable to load genres. Please try again later."
        );
    }
}

/* REQUEST TRACKING */

let movieRequestNumber = 0;
let searchRequestNumber = 0;
let searchTimer = null;

/* GENRE MOVIES */

async function showGenre(genreId) {
    const genre = genres.find(
        item => Number(item.id) === Number(genreId)
    );

    if (!genre) return;

    clearTimeout(searchTimer);

    searchRequestNumber++;
    movieRequestNumber++;

    const current = movieRequestNumber;

    selectedGenre = Number(genre.id);

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
        const data = await fetchTMDB("discover", {
            genre: genre.id
        });

        if (current !== movieRequestNumber) return;

        const movies = register(
            (data.results || [])
                .map(normalizeTMDBMovie)
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
        const data = await fetchTMDB("search", {
            query: term
        });

        if (current !== searchRequestNumber) return;

        const movies = register(
            (data.results || [])
                .map(normalizeTMDBMovie)
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
    `;

    showModal();
}

function closeModal() {
    const modal = getModal();

    if (!modal || modal.hidden) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");

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
