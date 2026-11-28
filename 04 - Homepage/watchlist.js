
const movieIndex = new Map();
let localCatalogMovies = [];
let catalogLoadPromise = null;

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

/*LOCAL MOVIE CATALOG*/

async function loadLocalCatalog() {
    if (catalogLoadPromise) return catalogLoadPromise;

    catalogLoadPromise = (async () => {
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

        localCatalogMovies = data.movies
            .filter(movie => movie && movie.id)
            .map(movie => ({
                ...movie,
                id: String(movie.id),
                year: movie.year || "N/A",
                rating: Number(movie.rating || 0),
                genres: Array.isArray(movie.genres) ? movie.genres : [],
                cast: Array.isArray(movie.cast) ? movie.cast : [],
                poster: movie.poster || "",
                backdrop: movie.backdrop || "",
                description: movie.description || "No description available."
            }));

        register(localCatalogMovies);
        return localCatalogMovies;
    })().catch(error => {
        catalogLoadPromise = null;
        throw error;
    });

    return catalogLoadPromise;
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
        const catalog = await loadLocalCatalog();

        // Ignore outdated search responses.
        if (currentRequest !== searchRequestNumber) {
            return;
        }

        const searchTerm = term.toLocaleLowerCase();
        const foundMovies = register(catalog.filter(movie => [
            movie.title,
            movie.description,
            movie.director,
            ...(movie.genres || []),
            ...(movie.cast || []).map(person =>
                typeof person === "string" ? person : person.name
            )
        ].join(" ").toLocaleLowerCase().includes(searchTerm)));

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

        console.error("Local movie search error:", error);

        showSearchResults(
            "Search Unavailable",
            `
                <p class="no-results">
                    ${escapeHTML(error.message || "Unable to search right now.")}
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
    modal.querySelector(".modal-media").innerHTML = "";

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

    const backdrop = details.backdrop || movie.backdrop;

    panel.style.setProperty(
        "--modal-backdrop",
        backdrop ? `url("${backdrop}")` : "none"
    );

    const poster = details.poster || movie.poster;

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
                                        src="${escapeHTML(person.photo || person.profile_path)}"
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

function renderLocalMovieDetails(movie) {
    const modal = getModal();
    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");
    const panel = modal.querySelector(".modal-panel");

    if (!media || !body || !panel) return;

    panel.style.setProperty(
        "--modal-backdrop",
        movie.backdrop ? `url("${escapeHTML(movie.backdrop)}")` : "none"
    );
    media.innerHTML = movie.poster
        ? `<img class="modal-poster" src="${escapeHTML(movie.poster)}" alt="${escapeHTML(movie.title)} poster">`
        : `<div class="poster-placeholder">${escapeHTML(movie.title)}</div>`;

    const cast = (Array.isArray(movie.cast) ? movie.cast : []).map(person =>
        typeof person === "string" ? { name: person, photo: "" } : person
    ).filter(person => person && person.name);

    body.innerHTML = `
        <p class="hero-label">CineMax Local Catalog</p>
        <h2 id="modal-title">${escapeHTML(movie.title)}</h2>
        <p class="modal-meta">
            ${escapeHTML(movie.year || "Year unknown")}
            ${movie.rating ? ` · <span class="modal-rating">★ ${formatRating(movie.rating)}</span>` : ""}
        </p>
        <div class="modal-tags">
            ${(movie.genres || []).map(genre => `<span class="tag">${escapeHTML(genre)}</span>`).join("")}
        </div>
        <p class="modal-description">${escapeHTML(movie.description || "No synopsis available.")}</p>
        ${movie.director ? `<div class="modal-credits"><p><span>Director</span> ${escapeHTML(movie.director)}</p></div>` : ""}
        ${cast.length ? `
            <section class="modal-section">
                <h3>Cast</h3>
                <div class="modal-cast-grid">
                    ${cast.map(person => `
                        <article class="modal-cast-item">
                            ${person.photo
                                ? `<img src="${escapeHTML(person.photo)}" alt="${escapeHTML(person.name)}" loading="lazy">`
                                : `<div class="cast-placeholder"><i data-lucide="user"></i></div>`}
                            <p>${escapeHTML(person.name)}</p>
                        </article>
                    `).join("")}
                </div>
            </section>
        ` : ""}
        <div class="modal-actions"><button type="button" class="modal-watch"></button></div>
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

    const button = body.querySelector(".modal-watch");
    updateWatchButton(button, movie);
    button.addEventListener("click", async () => {
        if (button.disabled) return;
        button.disabled = true;
        try {
            const saved = watchlistCache.some(item => String(item.id) === String(movie.id));
            await sendWatchlistAction(saved ? "remove" : "add", saved
                ? { id: String(movie.id) }
                : { movie });
            updateWatchButton(button, movie);
        } catch (error) {
            console.error("Watchlist update failed:", error);
            alert(error.message || "Unable to update your watchlist. Please try again.");
        } finally {
            button.disabled = false;
        }
    });

    media.querySelector("img")?.addEventListener("error", event => {
        const placeholder = document.createElement("div");
        placeholder.className = "poster-placeholder";
        placeholder.textContent = movie.title;
        event.currentTarget.replaceWith(placeholder);
    }, { once: true });

    refreshIcons();
}

function openModal(movie) {
    const modal = getModal();
    if (!modal || !movie) return;

    modalRequestNumber++;
    lastFocused = document.activeElement;
    showModal();
    renderLocalMovieDetails(movie);
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
