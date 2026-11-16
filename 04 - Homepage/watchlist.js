
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

const movieIndex = new Map();

let watchlistCache = [];
let lastFocused = null;
let modalRequestNumber = 0;

let searchRequestNumber = 0;
let searchTimer = null;

const $ = id => document.getElementById(id);

/*GENERAL HELPERS*/

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
    return Number.isFinite(value) ? value.toFixed(1) : "N/A";
}

function refreshIcons() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

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

/*TMDB API*/

async function fetchTMDB(type, { id = null, query = "" } = {}) {
    const parameters = new URLSearchParams({ type });

    if (id !== null) {
        parameters.set("id", String(id));
    }

    if (query) {
        parameters.set("query", query);
    }

    const response = await fetch(
        `tmdb_movies.php?${parameters.toString()}`
    );

    const data = await response.json();

    if (!response.ok || !data || data.error) {
        throw new Error(data?.error || "Unable to fetch movie data.");
    }

    return data;
}

/*CONVERT TMDB SEARCH RESULTS*/

const GENRE_NAMES = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    53: "Thriller",
    10752: "War",
    37: "Western"
};

function normalizeTMDBMovie(movie) {
    if (!movie || !movie.id) return null;

    return {
        id: String(movie.id),

        title: movie.title || movie.original_title || "Untitled",

        year: movie.release_date
            ? Number(movie.release_date.slice(0, 4))
            : "N/A",

        rating: Number(movie.vote_average || 0),

        genres: (movie.genre_ids || [])
            .map(id => GENRE_NAMES[id])
            .filter(Boolean),

        director: "",
        cast: [],

        poster: movie.poster_path
            ? `${TMDB_IMAGE_BASE}w500${movie.poster_path}`
            : "",

        backdrop: movie.backdrop_path
            ? `${TMDB_IMAGE_BASE}w1280${movie.backdrop_path}`
            : "",

        description: movie.overview || "No description available."
    };
}

/*WATCHLIST API*/

async function loadWatchlist() {
    const response = await fetch("watchlist_api.php?action=list", {
        credentials: "same-origin",
        cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to load your watchlist.");
    }

    watchlistCache = Array.isArray(data.watchlist)
        ? data.watchlist
        : [];

    register(watchlistCache);

    renderWatchlist();
    refreshIcons();
}

async function sendWatchlistAction(action, payload = {}) {
    const response = await fetch("watchlist_api.php", {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action,
            ...payload
        })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to update your watchlist.");
    }

    watchlistCache = Array.isArray(data.watchlist)
        ? data.watchlist
        : [];

    register(watchlistCache);

    renderWatchlist();
    refreshIcons();
}

/*MOVIE POSTERS AND CARDS*/

function createPoster(movie) {
    const content = movie.poster
        ? `<img src="${escapeHTML(movie.poster)}" alt="${escapeHTML(movie.title)} poster" loading="lazy">`
        : `<div class="poster-placeholder">${escapeHTML(movie.title)}</div>`;

    return `<div class="movie-poster">${content}</div>`;
}

function createMovieCard(movie) {
    return `
        <article class="movie-card">

            <a href="#" class="movie-open"
               data-open-movie="${escapeHTML(movie.id)}">

                ${createPoster(movie)}

                <div class="movie-info">
                    <h3>${escapeHTML(movie.title)}</h3>

                    <p class="movie-meta">
                        ${escapeHTML(movie.year || "N/A")} ·
                        ${escapeHTML((movie.genres || []).slice(0, 2).join(", "))}
                    </p>

                    <p class="movie-rating">
                        ★ ${formatRating(movie.rating)}
                    </p>
                </div>

            </a>

            <button
                type="button"
                class="remove-watchlist"
                data-remove-watchlist="${escapeHTML(movie.id)}"
            >
                Remove from Watchlist
            </button>

        </article>
    `;
}

/* Search result cards do not have a Remove button. */

function createSearchMovieCard(movie) {
    return `
        <article class="movie-card">

            <a href="#" class="movie-open"
               data-open-movie="${escapeHTML(movie.id)}">

                ${createPoster(movie)}

                <div class="movie-info">
                    <h3>${escapeHTML(movie.title)}</h3>

                    <p class="movie-meta">
                        ${escapeHTML(movie.year || "N/A")} ·
                        ${escapeHTML((movie.genres || []).slice(0, 2).join(", "))}
                    </p>

                    <p class="movie-rating">
                        ★ ${formatRating(movie.rating)}
                    </p>
                </div>

            </a>

        </article>
    `;
}

/*RENDER WATCHLIST*/

function renderWatchlist() {
    const container = $("watchlist-movies");
    const empty = $("empty-watchlist");

    if (!container) return;

    container.innerHTML = watchlistCache
        .map(createMovieCard)
        .join("");

    if (empty) {
        empty.hidden = watchlistCache.length > 0;
    }
}

/*MOVIE SEARCH*/

const searchInput = $("homepage-search");
const resultsSection = $("search-results-section");
const resultsBox = $("search-results");
const resultsTitle = $("search-title");

/*
 * Find the count element in the HTML.
 * If it does not exist, create it automatically
 * above the movie results row.
 */

let resultsCount = $("search-results-count");

if (!resultsCount && resultsBox) {
    resultsCount = document.createElement("p");

    resultsCount.id = "search-results-count";
    resultsCount.className = "search-results-count";
    resultsCount.hidden = true;

    resultsBox.parentNode.insertBefore(
        resultsCount,
        resultsBox
    );
}

function showSearchResults(title, html, countText = "") {
    if (!resultsSection || !resultsBox) return;

    if (resultsTitle) {
        resultsTitle.textContent = title;
    }

    if (resultsCount) {
        resultsCount.textContent = countText;
        resultsCount.hidden = !countText;
    }

    resultsBox.innerHTML = html;
    resultsSection.hidden = false;

    refreshIcons();
}

function clearSearchResults() {
    searchRequestNumber++;

    clearTimeout(searchTimer);

    if (resultsSection) {
        resultsSection.hidden = true;
    }

    if (resultsBox) {
        resultsBox.innerHTML = "";
    }

    if (resultsCount) {
        resultsCount.textContent = "";
        resultsCount.hidden = true;
    }

    if (searchInput) {
        searchInput.value = "";
    }
}

async function performSearch(query) {
    const term = query.trim();

    if (!term) {
        clearSearchResults();
        return;
    }

    const currentRequest = ++searchRequestNumber;

    // Show loading message first.
    showSearchResults(
        "Search Results",
        `<p class="no-results">Searching for "${escapeHTML(term)}"...</p>`
    );

    try {
        const movieData = await fetchTMDB("search", {
            query: term
        });

        // Ignore outdated search responses.
        if (currentRequest !== searchRequestNumber) {
            return;
        }

        const foundMovies = register(
            (movieData.results || [])
                .map(normalizeTMDBMovie)
                .filter(Boolean)
        );

        if (!foundMovies.length) {
            showSearchResults(
                "Search Results",
                `
                    <div class="empty-state">
                        <h3>No Movies Found</h3>
                        <p>
                            We couldn't find any movies matching
                            "${escapeHTML(term)}".
                            Try another title.
                        </p>
                    </div>
                `
            );

            return;
        }

        // Display movie cards separately from the count message.
        showSearchResults(
            "Search Results",
            foundMovies.map(createSearchMovieCard).join(""),
            `${foundMovies.length} movies found for "${term}"`
        );

    } catch (error) {
        if (currentRequest !== searchRequestNumber) {
            return;
        }

        console.error("TMDB search error:", error);

        showSearchResults(
            "Search Unavailable",
            `
                <p class="no-results">
                    Unable to search right now.
                    Please try again.
                </p>
            `
        );
    }
}

/* Search input with 300ms debounce. */

if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        const query = searchInput.value.trim();

        if (!query) {
            clearSearchResults();
            return;
        }

        searchTimer = setTimeout(() => {
            performSearch(query);
        }, 300);
    });
}

/*MOVIE DETAILS MODAL*/

function getModal() {
    return $("movie-modal");
}

function showModal() {
    const modal = getModal();

    if (!modal) return;

    modal.hidden = false;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    modal.querySelector(".modal-close")?.focus();

    refreshIcons();
}

function closeModal() {
    const modal = getModal();

    if (!modal || modal.hidden) return;

    modalRequestNumber++;

    modal.hidden = true;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    modal.querySelector(".modal-panel")
        ?.style.removeProperty("--modal-backdrop");

    if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
    }
}

function updateWatchButton(button, movie) {
    if (!button) return;

    const saved = watchlistCache.some(
        item => String(item.id) === String(movie.id)
    );

    button.textContent = saved
        ? "Remove from Watchlist"
        : "Add to Watchlist";

    button.classList.toggle("is-saved", saved);

    button.setAttribute("aria-pressed", String(saved));
}

function renderMovieDetails(movie, details) {
    const modal = getModal();

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");
    const panel = modal.querySelector(".modal-panel");

    const backdrop = details.backdrop_path
        ? `${TMDB_IMAGE_BASE}original${details.backdrop_path}`
        : movie.backdrop;

    panel.style.setProperty(
        "--modal-backdrop",
        backdrop ? `url("${backdrop}")` : "none"
    );

    const poster = details.poster_path
        ? `${TMDB_IMAGE_BASE}w500${details.poster_path}`
        : movie.poster;

    media.innerHTML = poster
        ? `
            <img
                class="modal-poster"
                src="${escapeHTML(poster)}"
                alt="${escapeHTML(details.title || movie.title)} poster"
            >
        `
        : `
            <div class="poster-placeholder">
                ${escapeHTML(details.title || movie.title)}
            </div>
        `;

    const director = (details.credits?.crew || [])
        .find(person => person.job === "Director");

    const cast = details.credits?.cast || [];

    const trailer = (details.videos?.results || []).find(video =>
        video.site === "YouTube" &&
        video.type === "Trailer" &&
        video.official
    ) || (details.videos?.results || []).find(video =>
        video.site === "YouTube" &&
        video.type === "Trailer"
    );

    const genres = (details.genres || [])
        .map(genre => genre.name);

    const movieYear = details.release_date
        ? details.release_date.slice(0, 4)
        : "N/A";

    const runtime = details.runtime
        ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
        : "Runtime unavailable";

    const savedMovie = {
        ...movie,

        id: String(details.id),

        title: details.title || movie.title,

        year: movieYear,

        rating: Number(details.vote_average || 0),

        genres,

        director: director?.name || "",

        cast: cast.slice(0, 5).map(person => person.name),

        poster,

        backdrop,

        description: details.overview ||
            movie.description ||
            "No description available."
    };

    body.innerHTML = `
        <p class="hero-label">CineMax Movie Guide</p>

        <h2 id="modal-title">
            ${escapeHTML(savedMovie.title)}
        </h2>

        <p class="modal-meta">
            ${escapeHTML(movieYear)} ·
            ${escapeHTML(runtime)} ·

            <span class="modal-rating">
                ★ ${formatRating(details.vote_average)}
            </span>
        </p>

        <div class="modal-tags">
            ${genres.map(genre =>
                `<span class="tag">${escapeHTML(genre)}</span>`
            ).join("")}
        </div>

        <p class="modal-description">
            ${escapeHTML(details.overview || "No synopsis available.")}
        </p>

        <div class="modal-credits">
            ${director
                ? `<p><span>Director</span> ${escapeHTML(director.name)}</p>`
                : ""}
        </div>

        <div class="modal-actions">

            ${trailer
                ? `
                    <a
                        class="modal-trailer"
                        href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i data-lucide="play"></i>
                        Watch Trailer
                    </a>
                `
                : `
                    <span class="modal-muted">
                        No trailer available.
                    </span>
                `
            }

            <button
                type="button"
                class="modal-watch"
                data-movie-id="${escapeHTML(savedMovie.id)}"
            ></button>

        </div>

        ${cast.length ? `
            <section class="modal-section">

                <h3>Cast</h3>

                <div class="modal-cast-grid">

                    ${cast.slice(0, 12).map(person => `
                        <article class="modal-cast-item">

                            ${person.profile_path
                                ? `
                                    <img
                                        src="${TMDB_IMAGE_BASE}w185${escapeHTML(person.profile_path)}"
                                        alt="${escapeHTML(person.name)}"
                                        loading="lazy"
                                    >
                                `
                                : `
                                    <div class="cast-placeholder">
                                        <i data-lucide="user"></i>
                                    </div>
                                `
                            }

                            <p>${escapeHTML(person.name)}</p>

                            <span>
                                ${escapeHTML(person.character || "")}
                            </span>

                        </article>
                    `).join("")}

                </div>

            </section>
        ` : ""}
    `;

    const button = body.querySelector(".modal-watch");

    updateWatchButton(button, savedMovie);

    button.addEventListener("click", async () => {
        if (button.disabled) return;

        button.disabled = true;

        try {
            const isCurrentlySaved = watchlistCache.some(
                item => String(item.id) === savedMovie.id
            );

            if (isCurrentlySaved) {
                await sendWatchlistAction("remove", {
                    id: savedMovie.id
                });
            } else {
                await sendWatchlistAction("add", {
                    movie: savedMovie
                });
            }

            updateWatchButton(button, savedMovie);

        } catch (error) {
            console.error("Watchlist update failed:", error);

            alert(
                error.message ||
                "Unable to update your watchlist. Please try again."
            );

        } finally {
            button.disabled = false;
        }
    });

    refreshIcons();
}

async function openModal(movie) {
    const modal = getModal();

    if (!modal || !movie) return;

    const requestId = ++modalRequestNumber;

    lastFocused = document.activeElement;

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");

    if (!media || !body) return;

    media.innerHTML = createPoster(movie);

    body.innerHTML = `
        <p class="hero-label">CineMax Movie Guide</p>

        <h2 id="modal-title">
            ${escapeHTML(movie.title)}
        </h2>

        <p class="modal-muted">
            Loading movie information...
        </p>
    `;

    showModal();

    try {
        const details = await fetchTMDB("movie", {
            id: movie.id
        });

        if (requestId !== modalRequestNumber || modal.hidden) {
            return;
        }

        renderMovieDetails(movie, details);

    } catch (error) {
        if (requestId !== modalRequestNumber) return;

        console.error("Movie details error:", error);

        body.innerHTML = `
            <h2 id="modal-title">
                ${escapeHTML(movie.title)}
            </h2>

            <p class="modal-muted">
                Unable to load the complete movie details.
                Please try again.
            </p>
        `;
    }
}

/*CLICK EVENTS*/

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const target = event.target;

    // Clear search
    if (target.closest("[data-clear-search]")) {
        clearSearchResults();
        return;
    }

    // Open movie details
    const openButton = target.closest("[data-open-movie]");

    if (openButton) {
        event.preventDefault();

        const movie = getMovie(openButton.dataset.openMovie);

        if (movie) {
            openModal(movie);
        }

        return;
    }

    // Remove movie from watchlist
    const removeButton = target.closest("[data-remove-watchlist]");

    if (removeButton) {
        removeButton.disabled = true;

        sendWatchlistAction("remove", {
            id: removeButton.dataset.removeWatchlist
        })
            .catch(error => {
                console.error("Unable to remove movie:", error);

                alert(
                    error.message ||
                    "Unable to update your watchlist. Please try again."
                );
            })
            .finally(() => {
                removeButton.disabled = false;
            });

        return;
    }

    // Close movie details
    if (target.closest("[data-close-modal]")) {
        closeModal();
    }
});

/*KEYBOARD EVENTS*/

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal();
        return;
    }

    const modal = getModal();

    if (event.key !== "Tab" || !modal || modal.hidden) {
        return;
    }

    const focusable = [...modal.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];

    if (!focusable.length) {
        event.preventDefault();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();

    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

/*IMAGE ERROR FALLBACK*/

document.addEventListener("error", event => {
    const image = event.target;

    if (
        !image ||
        image.tagName !== "IMG" ||
        !image.closest(".movie-poster, .modal-media, .modal-cast-item")
    ) {
        return;
    }

    const placeholder = document.createElement("div");

    placeholder.className = "poster-placeholder";

    placeholder.textContent = (image.alt || "Movie poster")
        .replace(/ poster$/, "");

    image.replaceWith(placeholder);

}, true);

/*INITIALIZE WATCHLIST*/

async function initializeWatchlist() {
    const container = $("watchlist-movies");
    const empty = $("empty-watchlist");

    if (!container) return;

    container.innerHTML = `
        <p class="no-results">
            Loading your watchlist...
        </p>
    `;

    if (empty) {
        empty.hidden = true;
    }

    try {
        await loadWatchlist();

    } catch (error) {
        console.error("Unable to load your watchlist:", error);

        container.innerHTML = `
            <p class="no-results">
                ${escapeHTML(error.message || "Unable to load your watchlist.")}
            </p>
        `;
    }
}

initializeWatchlist();
