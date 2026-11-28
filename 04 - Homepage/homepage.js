const $ = id => document.getElementById(id);
const adminMode = $("movie-catalog")?.dataset.adminMode === "true";

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

function refreshIcons() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

const formatRating = rating => {
    const value = Number(rating || 0);
    return Number.isFinite(value) ? value.toFixed(1) : "N/A";
};


/* ACCOUNT WATCHLIST - PHP JSON STORAGE */

let watchlistCache = [];
let watchlistLoaded = false;

function getWatchlist() {
    return watchlistCache;
}

function isSaved(id) {
    return watchlistCache.some(movie => String(movie.id) === String(id));
}

function notifyWatchlistChange() {
    document.dispatchEvent(new CustomEvent("watchlist:change"));
}

async function loadWatchlist() {
    const response = await fetch("watchlist_api.php?action=list", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to load your watchlist.");
    }

    watchlistCache = Array.isArray(data.watchlist) ? data.watchlist : [];
    watchlistLoaded = true;
    notifyWatchlistChange();

    return watchlistCache;
}

async function sendWatchlistAction(action, payload = {}) {
    const response = await fetch("watchlist_api.php", {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, ...payload })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to update your watchlist.");
    }

    watchlistCache = Array.isArray(data.watchlist) ? data.watchlist : [];
    watchlistLoaded = true;
    notifyWatchlistChange();

    return data;
}

async function addToWatchlist(movie) {
    if (!movie || !movie.id || isSaved(movie.id)) return false;

    await sendWatchlistAction("add", { movie });
    return true;
}

async function removeFromWatchlist(id) {
    if (!id) return false;

    await sendWatchlistAction("remove", { id: String(id) });
    return true;
}

async function toggleWatchlist(movie) {
    if (!movie || !movie.id) return false;

    if (isSaved(movie.id)) {
        await removeFromWatchlist(movie.id);
        return false;
    }

    await addToWatchlist(movie);
    return true;
}

/* MOVIE DATA */

const movieIndex = new Map();
let localCatalogMovies = [];

async function loadAdminMovies() {
    const section = $("admin-movies-section");
    const grid = $("admin-movies-grid");
    if (grid) grid.innerHTML = loadingHTML("Loading CineMax Collection...");

    try {
        const response = await fetch("../06 - Admin/admin_movies_api.php", {
            credentials: "same-origin",
            cache: "no-store"
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.movies)) {
            throw new Error(data.error || "Unable to load CineMax Collection.");
        }

        localCatalogMovies = register(data.movies.map(movie => ({
            ...movie,
            id: String(movie.id),
            rating: Number(movie.rating || 0),
            genres: Array.isArray(movie.genres) ? movie.genres : [],
            cast: Array.isArray(movie.cast) ? movie.cast : [],
            poster: movie.poster || "",
            backdrop: movie.backdrop || movie.poster || "",
            backdropSmall: movie.backdropSmall || movie.poster || "",
            description: movie.description || "No description available.",
            mediaType: "movie"
        })));

        if (section && grid) {
            section.hidden = localCatalogMovies.length === 0;
            grid.innerHTML = localCatalogMovies.map(movie => `
                <article class="movie-card">
                    <a href="#" class="movie-open" data-open-movie="${escapeHTML(movie.id)}">
                        ${movie.poster ? `<img class="movie-poster" src="${escapeHTML(movie.poster)}" alt="${escapeHTML(movie.title)} poster" loading="lazy">` : `<div class="movie-poster poster-placeholder">${escapeHTML(movie.title)}</div>`}
                        <div class="movie-info"><h3>${escapeHTML(movie.title)}</h3><p class="movie-meta">${escapeHTML(movie.year || "Year unknown")}</p><p class="movie-rating">${Number(movie.rating) > 0 ? `? ${formatRating(movie.rating)}` : "Not rated"}</p></div>
                    </a>
                </article>
            `).join("");
        }

        setCatalogMovieRows();
        if ($("cinemaShowcase")) {
            setHero(localCatalogMovies.length ? localCatalogMovies : tmdbTrending);
        }
    } catch (error) {
        console.error("Unable to load CineMax Collection:", error);
        if (section && grid) {
            section.hidden = false;
            grid.innerHTML = '<p class="empty-state">CineMax Collection could not be loaded.</p>';
        }
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

function setCatalogMovieRows() {
    if (!$("trending")) return;
    const movies = localCatalogMovies;
    localTrendingMovies = movies.slice(0, 12).map(movie => ({ ...movie, trending: true }));
    localTopRatedMovies = [...movies]
        .sort((first, second) => Number(second.rating) - Number(first.rating))
        .slice(0, 10)
        .map(movie => ({ ...movie, topRated: true }));
    homeLoaded = true;
    renderTrending();
    renderTopRated();
}

function getMovie(id) {
    return movieIndex.get(String(id));
}

/* SAMPLE MOVIES (only used as a fallback if the API fails) */

const SAMPLE_MOVIES = register([
    {
        id: "dark-knight",
        title: "The Dark Knight",
        year: 2008,
        rating: 9.0,
        genres: ["Action", "Crime", "Drama"],
        director: "Christopher Nolan",
        cast: ["Christian Bale", "Heath Ledger"],
        poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        backdrop: "",
        backdropSmall: "",
        description: "When the Joker threatens Gotham, Batman faces one of his greatest challenges.",
        trending: true,
        topRated: true
    },
    {
        id: "truman-show",
        title: "The Truman Show",
        year: 1998,
        rating: 8.2,
        genres: ["Drama", "Comedy", "Sci-Fi"],
        director: "Peter Weir",
        cast: ["Jim Carrey", "Laura Linney"],
        poster: "https://image.tmdb.org/t/p/w500/vuza0Wq239yBXOadKlGwJsZJFE.jpg",
        backdrop: "",
        backdropSmall: "",
        description: "A man slowly discovers that his entire life may be one big television show.",
        trending: true,
        topRated: true
    },
    {
        id: "dead-poets",
        title: "Dead Poets Society",
        year: 1989,
        rating: 8.1,
        genres: ["Drama"],
        director: "Peter Weir",
        cast: ["Robin Williams", "Ethan Hawke"],
        poster: "",
        backdrop: "",
        backdropSmall: "",
        description: "An inspiring teacher encourages his students to think differently and embrace life.",
        trending: true,
        topRated: true
    },
    {
        id: "titanic",
        title: "Titanic",
        year: 1997,
        rating: 7.9,
        genres: ["Romance", "Drama"],
        director: "James Cameron",
        cast: ["Leonardo DiCaprio", "Kate Winslet"],
        poster: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
        backdrop: "",
        backdropSmall: "",
        description: "Two young people from different worlds meet aboard the legendary Titanic.",
        trending: true,
        topRated: true
    },
    {
        id: "home-alone",
        title: "Home Alone",
        year: 1990,
        rating: 7.7,
        genres: ["Comedy", "Family"],
        director: "Chris Columbus",
        cast: ["Macaulay Culkin", "Joe Pesci"],
        poster: "https://image.tmdb.org/t/p/w500/onTSipZ8R3bliBdKfPtsDuHTdlL.jpg",
        backdrop: "",
        backdropSmall: "",
        description: "A young boy is accidentally left home alone during the holidays.",
        trending: true,
        topRated: true
    },
    {
        id: "inception",
        title: "Inception",
        year: 2010,
        rating: 8.8,
        genres: ["Sci-Fi", "Action", "Thriller"],
        director: "Christopher Nolan",
        cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt"],
        poster: "",
        backdrop: "",
        backdropSmall: "",
        description: "A skilled thief enters people's dreams to steal valuable secrets.",
        trending: true,
        topRated: true
    },
    {
        id: "shawshank-redemption",
        title: "The Shawshank Redemption",
        year: 1994,
        rating: 9.3,
        genres: ["Drama"],
        director: "Frank Darabont",
        cast: [],
        poster: "",
        backdrop: "",
        backdropSmall: "",
        description: "A banker forms a friendship and finds hope during a life sentence in prison.",
        trending: false,
        topRated: true
    },
    {
        id: "the-godfather",
        title: "The Godfather",
        year: 1972,
        rating: 9.2,
        genres: ["Crime", "Drama"],
        director: "Francis Ford Coppola",
        cast: [],
        poster: "",
        backdrop: "",
        backdropSmall: "",
        description: "The aging patriarch of a crime family transfers control to his reluctant son.",
        trending: false,
        topRated: true
    },
    {
        id: "schindlers-list",
        title: "Schindler's List",
        year: 1993,
        rating: 9.0,
        genres: ["Drama", "History"],
        director: "Steven Spielberg",
        cast: [],
        poster: "",
        backdrop: "",
        backdropSmall: "",
        description: "A businessman risks everything to save lives during the Holocaust.",
        trending: false,
        topRated: true
    },
    {
        id: "12-angry-men",
        title: "12 Angry Men",
        year: 1957,
        rating: 9.0,
        genres: ["Drama"],
        director: "Sidney Lumet",
        cast: [],
        poster: "",
        backdrop: "",
        backdropSmall: "",
        description: "A juror challenges his peers to reconsider a verdict in a murder trial.",
        trending: false,
        topRated: true
    }
]);

/* TMDB */

async function fetchTMDB(type, {
    query = "",
    page = 1,
    id = null,
    genre = null,
    from = null,
    to = null
} = {}) {
    const parameters = new URLSearchParams({
        type,
        page: String(page)
    });

    if (query) parameters.set("query", query);
    if (id !== null) parameters.set("id", String(id));
    if (genre !== null) parameters.set("genre", String(genre));
    if (from) parameters.set("from", from);
    if (to) parameters.set("to", to);

    // tmdb_movies.php sends its own Cache-Control header, so the browser can
    // reuse successful responses for a few minutes.
    const response = await fetch(`tmdb_movies.php?${parameters.toString()}`);

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("The movie service returned an invalid response.");
    }

    if (!response.ok || !data || data.error) {
        throw new Error(data?.error || "Unable to fetch movie data.");
    }

    // Support both cached and direct TMDB response structures.
    const result = data.data ?? data;

    if (result.error) {
        throw new Error(result.error);
    }

    return result;
}

function normalizeTMDBMovie(movie) {
    if (!movie || !movie.id) {
        return null;
    }

    const title =
        movie.title ||
        movie.name ||
        movie.original_title ||
        movie.original_name ||
        "Untitled";

    // Find an existing sample movie with the same title.
    const sampleMovie = SAMPLE_MOVIES.find(sample =>
        sample.title.toLowerCase() === title.toLowerCase()
    );

    const genres = movie.genre_ids
        ? movie.genre_ids.map(id => GENRE_NAMES[id]).filter(Boolean)
        : (movie.genres || []).map(genre => genre.name).filter(Boolean);

    return {
        id: String(movie.id),
        title,

        year: (movie.release_date || movie.first_air_date)
            ? Number((movie.release_date || movie.first_air_date).slice(0, 4))
            : "N/A",

        releaseDate: movie.release_date || movie.first_air_date || "",

        rating: Number(movie.vote_average || 0),

        genres,

        director: "",
        cast: [],

        // Use the TMDB poster first, then the sample poster.
        poster: movie.poster_path
            ? `${TMDB_IMAGE_BASE}w500${movie.poster_path}`
            : (sampleMovie?.poster || ""),

        backdrop: movie.backdrop_path
            ? `${TMDB_IMAGE_BASE}w1280${movie.backdrop_path}`
            : (sampleMovie?.backdrop || ""),

        backdropSmall: movie.backdrop_path
            ? `${TMDB_IMAGE_BASE}w780${movie.backdrop_path}`
            : (sampleMovie?.backdropSmall || ""),

        description: movie.overview ||
            sampleMovie?.description ||
            "No description available.",

        mediaType: movie.media_type === "tv" || movie.name
            ? "tv"
            : "movie",

        trending: false,
        topRated: false
    };
}



/* IMAGE FALLBACKS */
document.addEventListener("error", event => {
    const image = event.target;

    if (
        !image ||
        image.tagName !== "IMG" ||
        !image.closest(
            ".movie-poster, .continue-thumb, .backdrop-open, .home-backdrop-open"
        )
    ) {
        return;
    }

    // Avoid repeatedly attempting the same failed fallback.
    if (image.dataset.fallbackAttempted !== "true") {
        image.dataset.fallbackAttempted = "true";

        const posterContainer = image.closest(".movie-poster");

        if (posterContainer) {
            const title = image.alt.replace(/ poster$/, "");

            const sampleMovie = SAMPLE_MOVIES.find(
                movie => movie.title.toLowerCase() === title.toLowerCase()
            );

            if (
                sampleMovie?.poster &&
                sampleMovie.poster !== image.src
            ) {
                image.src = sampleMovie.poster;
                return;
            }
        }
    }

    const placeholder = document.createElement("div");

    placeholder.className = "poster-placeholder";
    placeholder.textContent = image.alt.replace(/ poster$/, "");

    image.replaceWith(placeholder);

}, true);


/* MOVIE CARDS */

function createPoster(movie) {
    const content = movie.poster
        ? `<img src="${escapeHTML(movie.poster)}"
                alt="${escapeHTML(movie.title)} movie image"
                loading="lazy">`
        : `<div class="poster-placeholder">${escapeHTML(movie.title)}</div>`;

    return `<div class="movie-poster">${content}</div>`;
}


function createMovieCard(movie, extraContent = "") {
    const image =
        movie.backdropSmall ||
        movie.backdrop ||
        movie.poster ||
        "";

    const releaseDate = movie.releaseDate
        ? new Date(`${movie.releaseDate}T00:00:00`).toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        )
        : movie.year || "Release date unavailable";

    return `
        <article class="home-backdrop-card">
            <a href="#"
               class="home-backdrop-open"
               data-open-movie="${escapeHTML(movie.id)}"
               aria-label="View details for ${escapeHTML(movie.title)}">

                ${image
                    ? `<img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(movie.title)}"
                        loading="lazy">`
                    : `<div class="home-backdrop-placeholder">
                        ${escapeHTML(movie.title)}
                    </div>`}

                <div class="home-backdrop-overlay">
                    <span class="home-backdrop-date">
                        ${escapeHTML(releaseDate)}
                    </span>

                    <h3 class="home-backdrop-title">
                        ${escapeHTML(movie.title)}
                    </h3>

                    <span class="home-backdrop-rating">
                        ★ ${formatRating(movie.rating)}
                    </span>
                </div>
            </a>

            ${extraContent}
        </article>
    `;
}

function createBackdropCard(movie) {
    const image = movie.backdropSmall || movie.backdrop || movie.poster;
    const isUpcoming = Boolean(movie.releaseDate) && movie.releaseDate > today;
    const reminder = String(movie.id) !== "1003596" && isUpcoming
        ? `<button type="button" class="remind-button ${isReminderSaved(movie.id) ? "is-saved" : ""}" data-remind-movie="${escapeHTML(movie.id)}" aria-pressed="${isReminderSaved(movie.id)}">${isReminderSaved(movie.id) ? "Reminder saved" : "Remind me"}</button>`
        : "";
    const releaseText = isUpcoming
        ? new Date(`${movie.releaseDate}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        : (movie.year && movie.year !== "N/A"
            ? String(movie.year)
            : "Release date unavailable");
    const genreText = (movie.genres || []).slice(0, 2).join(", ") || "Genre unavailable";
    const ratingText = Number(movie.rating) > 0
        ? `\u2605 ${formatRating(movie.rating)}`
        : "Not rated";
    return `
        <article class="backdrop-card">
            <a href="#" class="backdrop-open" data-open-movie="${escapeHTML(movie.id)}" aria-label="View details for ${escapeHTML(movie.title)}">
                <div class="backdrop-image">
                    ${image
                        ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(movie.title)}" loading="lazy" decoding="async">`
                        : `<div class="backdrop-placeholder">${escapeHTML(movie.title)}</div>`}
                </div>
                <div class="backdrop-info">
                    <h3 class="backdrop-title">${escapeHTML(movie.title)}</h3>
                    <p class="backdrop-meta">
                        <span>${escapeHTML(releaseText)}</span>
                        <span class="backdrop-separator">\u2022</span>
                        <span>${escapeHTML(genreText)}</span>
                        <span class="backdrop-separator">\u2022</span>
                        <span class="backdrop-rating">${escapeHTML(ratingText)}</span>
                    </p>
                </div>
            </a>
            ${reminder}
        </article>
    `;
}
function renderBackdropRow(id, movies, loadingText) {
    const container = $(id);
    if (!container) return;
    container.innerHTML = movies.length
        ? movies.slice(0, 20).map(createBackdropCard).join("")
        : loadingHTML(loadingText);

}

function createContinueCard(movie, progress) {
    const source = movie.backdropSmall || movie.poster;

    const thumb = source
        ? `<img src="${escapeHTML(source)}"
                alt="${escapeHTML(movie.title)}"
                loading="lazy"
                class="${movie.backdropSmall ? "" : "from-poster"}">`
        : `<div class="poster-placeholder">${escapeHTML(movie.title)}</div>`;

    return `
        <article class="movie-card continue-card">
            <a href="#" class="movie-open"
               data-open-movie="${escapeHTML(movie.id)}">

                <div class="continue-thumb">
                    ${thumb}
                </div>

                <div class="movie-info">
                    <h3>${escapeHTML(movie.title)}</h3>

                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill"
                                 style="width:${Number(progress)}%">
                            </div>
                        </div>

                        <p>${Number(progress)}% watched</p>
                    </div>
                </div>
            </a>
        </article>
    `;
}

function createTopCard(movie, rank) {
    return `
        <li class="top-card ${rank === 1 ? "is-first" : ""}">
            <span class="top-rank" aria-hidden="true">${rank}</span>
            ${createBackdropCard(movie)}
        </li>
    `;
}

/* MOVIE MODAL */

let lastFocused = null;
let modalRequestNumber = 0;

const LEGACY_PERSONAL_RATING_KEY = "cinemax-personal-ratings";
const ratingUsername = document.querySelector(".profile-menu")?.dataset.profileUsername || "";
const PERSONAL_RATING_KEY = `${LEGACY_PERSONAL_RATING_KEY}:${ratingUsername.toLowerCase()}`;
const ratingCsrfToken = document.querySelector(".profile-menu")?.dataset.csrfToken || "";

function getModal() {
    return $("movie-modal");
}

function getPersonalRatings() {
    try {
        return JSON.parse(
            localStorage.getItem(PERSONAL_RATING_KEY)
        ) || {};
    } catch {
        return {};
    }
}

function savePersonalRating(movieId, rating) {
    const ratings = getPersonalRatings();

    ratings[String(movieId)] = rating;

    try {
        localStorage.setItem(
            PERSONAL_RATING_KEY,
            JSON.stringify(ratings)
        );
    } catch (error) {
        console.warn("Unable to save your rating:", error);
    }
}

function getLegacyPersonalRatings() {
    try {
        const ratings = JSON.parse(localStorage.getItem(LEGACY_PERSONAL_RATING_KEY));
        return ratings && typeof ratings === "object" && !Array.isArray(ratings)
            ? ratings
            : {};
    } catch {
        return {};
    }
}

async function requestPersonalRatings(method, ratings) {
    const options = {
        method,
        credentials: "same-origin",
        headers: { Accept: "application/json" }
    };

    if (method === "POST") {
        options.headers["Content-Type"] = "application/json";
        options.headers["X-CSRF-Token"] = ratingCsrfToken;
        options.body = JSON.stringify({ ratings });
    }

    const response = await fetch("movie_ratings.php", options);
    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("The rating service returned an invalid response.");
    }

    if (!response.ok || !data.success || !data.ratings || typeof data.ratings !== "object") {
        throw new Error(data.error || "Unable to sync movie ratings.");
    }

    return data.ratings;
}

async function syncPersonalRatings() {
    const localRatings = getPersonalRatings();
    const legacyRatings = getLegacyPersonalRatings();

    try {
        const serverRatings = await requestPersonalRatings("GET");
        const pendingRatings = {};

        for (const [movieId, rating] of Object.entries(localRatings)) {
            if (Number(serverRatings[movieId]) !== Number(rating)) {
                pendingRatings[movieId] = rating;
            }
        }

        for (const [movieId, rating] of Object.entries(legacyRatings)) {
            if (!(movieId in serverRatings) && !(movieId in localRatings)) {
                pendingRatings[movieId] = rating;
            }
        }

        const ratings = Object.keys(pendingRatings).length
            ? await requestPersonalRatings("POST", pendingRatings)
            : serverRatings;

        localStorage.setItem(PERSONAL_RATING_KEY, JSON.stringify(ratings));
        localStorage.removeItem(LEGACY_PERSONAL_RATING_KEY);
        return ratings;
    } catch (error) {
        console.error("Movie ratings could not be synced:", error);
        return { ...legacyRatings, ...localRatings };
    }
}

async function savePersonalRatingToServer(movieId, rating) {
    const ratings = await requestPersonalRatings("POST", {
        [String(movieId)]: rating
    });

    try {
        localStorage.setItem(PERSONAL_RATING_KEY, JSON.stringify(ratings));
    } catch (error) {
        console.warn("Unable to cache your synced rating:", error);
    }
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

function updateWatchButton(button, movie) {
    if (!button) return;

    const saved = isSaved(movie.id);

    button.textContent = saved
        ? "Remove from Watchlist"
        : "Add to Watchlist";

    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
}

function renderPersonalRating(movie) {
    const ratings = getPersonalRatings();
    const currentRating = Number(ratings[String(movie.id)] || 0);

    return `
        <section
            class="modal-section personal-rating-section"
            data-rating-movie-section="${escapeHTML(movie.id)}">
            <h3>Your Rating</h3>

            <div class="personal-rating-stars"
                 role="group"
                 aria-label="Rate this movie">

                ${[1, 2, 3, 4, 5].map(star => `
                    <button
                        type="button"
                        class="personal-star ${star <= currentRating ? "active" : ""}"
                        data-personal-rating="${star}"
                        data-rating-movie="${escapeHTML(movie.id)}"
                        aria-label="${star} out of 5 stars"
                        aria-pressed="${star === currentRating}">
                        \u2605
                    </button>
                `).join("")}
            </div>

            <p class="personal-rating-label">
                ${currentRating
                    ? `Your rating: ${currentRating}/5`
                    : "Select a rating"}
            </p>
        </section>
    `;
}

function renderProviders(providerData) {
    if (!providerData) {
        return `
            <section class="modal-section">
                <h3>Where to Watch</h3>
                <p class="modal-muted">
                    No Philippine streaming availability information found.
                </p>
            </section>
        `;
    }

    const providers = [
        ...(providerData.flatrate || []),
        ...(providerData.free || []),
        ...(providerData.ads || []),
        ...(providerData.rent || []),
        ...(providerData.buy || [])
    ];

    const uniqueProviders = [
        ...new Map(
            providers.map(provider => [
                provider.provider_id,
                provider
            ])
        ).values()
    ];

    if (!uniqueProviders.length) {
        return `
            <section class="modal-section">
                <h3>Where to Watch</h3>
                <p class="modal-muted">
                    No Philippine streaming providers are currently listed.
                </p>
            </section>
        `;
    }

    const providerLink = providerData.link;

    return `
        <section class="modal-section">
            <h3>Where to Watch <span>Philippines</span></h3>

            <div class="provider-list">
                ${uniqueProviders.map(provider => `
                    <a
                        class="provider-item"
                        ${providerLink
                            ? `href="${escapeHTML(providerLink)}"
                               target="_blank"
                               rel="noopener noreferrer"`
                            : ""}
                        aria-label="${escapeHTML(provider.provider_name)}">

                        ${provider.logo_path
                            ? `<img
                                src="${escapeHTML(provider.logo_path)}"
                                alt=""
                                loading="lazy">`
                            : ""}

                        <span>${escapeHTML(provider.provider_name)}</span>
                    </a>
                `).join("")}
            </div>

            <p class="modal-muted">
                Availability information is provided with the movie catalog.
            </p>
        </section>
    `;
}

function renderCast(cast) {
    if (!cast || !cast.length) {
        return "";
    }

    return `
        <section class="modal-section">
            <h3>Cast</h3>
            <div class="modal-cast-grid">
                ${cast.slice(0, 12).map(person => `
                    <article class="modal-cast-item">
                        ${person.profile_path
                            ? `<img
                                src="${escapeHTML(person.photo || person.profile_path)}"
                                alt="${escapeHTML(person.name)}"
                                loading="lazy">`
                            : `<div class="cast-placeholder">
                                <i data-lucide="user"></i>
                            </div>`}
                        <p>${escapeHTML(person.name)}</p>
                        <span>${escapeHTML(person.character || "")}</span>
                    </article>
                `).join("")}
            </div>
        </section>
    `;
}

function renderRecommendations(recommendations) {
    const movies = (recommendations || [])
        .map(movie => movie && movie.id ? { ...movie, id: String(movie.id) } : null)
        .filter(Boolean);

    register(movies);

    if (!movies.length) {
        return `
            <section class="modal-section">
                <h3>More Like This</h3>
                <p class="modal-muted">No recommendations available.</p>
            </section>
        `;
    }

    return `
        <section class="modal-section">
            <h3>More Like This</h3>
            <div class="modal-recommendations">
                ${movies.slice(0, 8).map(movie => `
                    <button
                        type="button"
                        class="recommendation-card"
                        data-open-movie="${escapeHTML(movie.id)}">
                        ${movie.poster
                            ? `<img
                                src="${escapeHTML(movie.poster)}"
                                alt="${escapeHTML(movie.title)} movie image"
                                loading="lazy">`
                            : `<div class="poster-placeholder">
                                ${escapeHTML(movie.title)}
                            </div>`}
                        <span>${escapeHTML(movie.title)}</span>
                        <small>${escapeHTML(movie.year)}</small>
                    </button>
                `).join("")}
            </div>
        </section>
    `;
}


/* ACCOUNT-BASED COMMUNITY REVIEWS */

let reviewCsrfToken = "";

function renderReviewSection(movieId, kind = "movie") {
    return `
        <section class="modal-section reviews-section"
                 data-reviews-section
                 data-movie-id="${escapeHTML(movieId)}"
                 data-review-kind="${escapeHTML(kind)}">
            <div class="reviews-heading">
                <div>
                    <h3>Community Reviews</h3>
                    <p class="modal-muted" data-review-summary>Loading reviews...</p>
                </div>
            </div>
            <div class="review-form-container" data-review-form-container>
                <p class="modal-muted">Loading your review form...</p>
            </div>
            <div class="community-review-list" data-review-list aria-live="polite">
                <p class="modal-muted">Loading community reviews...</p>
            </div>
        </section>
    `;
}

function formatReviewDate(value) {
    if (!value) return "Recently";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function renderReviewForm(movieId, kind, ownReview = null) {
    const text = ownReview?.text || "";

    return `
        <form class="review-form" data-review-form>
            <h4>${ownReview ? "Edit your review" : "Write a review"}</h4>
            <p class="review-rating-note">
                Your review will use the rating you selected above.
            </p>

            <textarea id="review-text-${escapeHTML(movieId)}"
                      name="text"
                      rows="4"
                      minlength="3"
                      maxlength="1500"
                      placeholder="What did you think about this movie?"
                      required>${escapeHTML(text)}</textarea>

            <div class="review-form-footer">
                <small>3–1,500 characters</small>
                <button type="submit" class="review-submit-button">
                    ${ownReview ? "Update review" : "Post review"}
                </button>
            </div>
            <p class="review-feedback" data-review-feedback role="status"></p>
        </form>
    `;
}

function renderCommunityReviews(reviews, movieId, kind) {
    if (!reviews.length) {
        return `
            <div class="reviews-empty-state">
                <p>No community reviews yet.</p>
                <span>Be the first CineMax member to share your thoughts.</span>
            </div>
        `;
    }

    return reviews.map(review => `
        <article class="community-review" data-review-id="${escapeHTML(review.id)}">
            <div class="community-review-top">
                <div class="reviewer-avatar" aria-hidden="true">
                    ${escapeHTML(String(review.name || "U").trim().charAt(0).toUpperCase())}
                </div>
                <div class="reviewer-details">
                    <strong>${escapeHTML(review.name || "CineMax member")}</strong>
                    <span>${escapeHTML(formatReviewDate(review.created))}</span>
                </div>
                <span class="community-review-rating" aria-label="${Number(review.rating)} out of 5 stars">
                    ${"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                    <small>${Number(review.rating)}/5</small>
                </span>
            </div>
            <p class="community-review-text">${escapeHTML(review.text || "")}</p>
            ${review.mine ? `
                <div class="community-review-actions">
                    <span class="your-review-label">Your review</span>
                    <button type="button"
                            class="review-delete-button"
                            data-delete-review="${escapeHTML(review.id)}"
                            data-review-movie="${escapeHTML(movieId)}"
                            data-review-kind="${escapeHTML(kind)}">
                        Delete
                    </button>
                </div>
            ` : ""}
        </article>
    `).join("");
}

function paintMovieReviews(section, data, movieId, kind) {
    if (!section?.isConnected) return;

    const summary = section.querySelector("[data-review-summary]");
    const formContainer = section.querySelector("[data-review-form-container]");
    const list = section.querySelector("[data-review-list]");
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    const ownReview = reviews.find(review => review.mine) || null;

    if (summary) {
        const count = Number(data.count || 0);
        const average = Number(data.average || 0);
        summary.textContent = count
            ? `${average.toFixed(1)}/5 · ${count} ${count === 1 ? "review" : "reviews"}`
            : "No ratings yet";
    }

    if (formContainer) {
        formContainer.innerHTML = renderReviewForm(movieId, kind, ownReview);
    }

    if (list) {
        list.innerHTML = renderCommunityReviews(reviews, movieId, kind);
    }
}

async function loadMovieReviews(movieId, kind = "movie") {
    const section = document.querySelector(
        `[data-reviews-section][data-movie-id="${CSS.escape(String(movieId))}"]`
    );

    if (!section) return;

    const parameters = new URLSearchParams({
        kind,
        movie_id: String(movieId)
    });

    try {
        const response = await fetch(`reviews.php?${parameters.toString()}`, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Unable to load reviews.");
        }

        if (data.csrf_token) reviewCsrfToken = data.csrf_token;

        // Keep the existing Your Rating stars and the review rating in sync.
        const ownReview = Array.isArray(data.reviews)
            ? data.reviews.find(review => review.mine)
            : null;
        if (ownReview && Number(ownReview.rating) >= 1 && Number(ownReview.rating) <= 5) {
            savePersonalRating(movieId, Number(ownReview.rating));
            const movie = getMovie(movieId);
            const personalSection = document.querySelector(
                ".personal-rating-section"
            );
            if (movie && personalSection) {
                personalSection.outerHTML = renderPersonalRating(movie);
            }
        }

        paintMovieReviews(section, data, movieId, kind);
    } catch (error) {
        console.error("Unable to load community reviews:", error);

        const formContainer = section.querySelector("[data-review-form-container]");
        const list = section.querySelector("[data-review-list]");
        const summary = section.querySelector("[data-review-summary]");

        if (summary) summary.textContent = "Reviews are currently unavailable.";
        if (formContainer) {
            formContainer.innerHTML = `<p class="modal-muted">${escapeHTML(error.message)}</p>`;
        }
        if (list) list.innerHTML = "";
    }
}

async function saveMovieReview(form) {
    const section = form.closest("[data-reviews-section]");
    if (!section) return;

    const movieId = section.dataset.movieId;
    const kind = section.dataset.reviewKind || "movie";
    const submitButton = form.querySelector('[type="submit"]');
    const feedback = form.querySelector("[data-review-feedback]");
    const rating = Number(getPersonalRatings()[String(movieId)] || 0);
    const text = form.elements.text.value.trim();

    if (rating < 1 || rating > 5) {
        if (feedback) feedback.textContent = "Please choose a rating in the Your Rating section above first.";
        return;
    }

    if (submitButton) submitButton.disabled = true;
    if (feedback) feedback.textContent = "Saving your review...";

    try {
        const response = await fetch("reviews.php", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": reviewCsrfToken
            },
            body: JSON.stringify({
                kind,
                movie_id: movieId,
                rating,
                text
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Unable to save your review.");
        }

        if (data.csrf_token) reviewCsrfToken = data.csrf_token;

        // Posting/updating a review also updates the existing personal rating.
        savePersonalRating(movieId, rating);
        const movie = getMovie(movieId);
        const personalSection = document.querySelector(
            ".personal-rating-section"
        );
        if (movie && personalSection) {
            personalSection.outerHTML = renderPersonalRating(movie);
        }

        paintMovieReviews(section, data, movieId, kind);

        const newFeedback = section.querySelector("[data-review-feedback]");
        if (newFeedback) newFeedback.textContent = "Your review has been saved.";
    } catch (error) {
        console.error("Unable to save review:", error);
        if (feedback) feedback.textContent = error.message;
    } finally {
        if (submitButton?.isConnected) submitButton.disabled = false;
    }
}

async function deleteMovieReview(button) {
    const movieId = button.dataset.reviewMovie;
    const kind = button.dataset.reviewKind || "movie";
    const reviewId = button.dataset.deleteReview;

    if (!movieId || !reviewId || !window.confirm("Delete your review for this title?")) {
        return;
    }

    button.disabled = true;

    try {
        const response = await fetch("reviews.php", {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": reviewCsrfToken
            },
            body: JSON.stringify({
                kind,
                movie_id: movieId,
                review_id: reviewId
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Unable to delete your review.");
        }

        if (data.csrf_token) reviewCsrfToken = data.csrf_token;

        const section = button.closest("[data-reviews-section]");
        paintMovieReviews(section, data, movieId, kind);
    } catch (error) {
        console.error("Unable to delete review:", error);
        alert(error.message || "Unable to delete your review.");
        button.disabled = false;
    }
}

document.addEventListener("submit", event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches("[data-review-form]")) {
        return;
    }

    event.preventDefault();
    saveMovieReview(form);
});

/* MODAL TRAILER PLAYER */

let youtubeApiPromise = null;
let trailerPlayer = null;
let trailerMountId = 0;

function loadYouTubeApi() {
    if (window.YT && typeof window.YT.Player === "function") {
        return Promise.resolve(window.YT);
    }

    if (youtubeApiPromise) return youtubeApiPromise;

    youtubeApiPromise = new Promise((resolve, reject) => {
        const previousHandler = window.onYouTubeIframeAPIReady;

        const fail = message => {
            youtubeApiPromise = null;
            reject(new Error(message));
        };

        const timer = setTimeout(() => {
            fail("YouTube player API timed out.");
        }, 10000);

        window.onYouTubeIframeAPIReady = () => {
            clearTimeout(timer);

            try {
                if (typeof previousHandler === "function") {
                    previousHandler();
                }
            } catch (error) {
                console.warn("Previous YouTube API callback failed:", error);
            }

            if (window.YT && typeof window.YT.Player === "function") {
                resolve(window.YT);
            } else {
                fail("YouTube player API loaded without a Player constructor.");
            }
        };

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => {
            clearTimeout(timer);
            fail("YouTube player API could not be loaded.");
        };

        document.head.appendChild(script);
    });

    return youtubeApiPromise;
}

function getTrailerCandidates(videos) {
    const seen = new Set();

    const rank = video =>
        (video.type === "Trailer" ? 0 : 2) + (video.official ? 0 : 1);

    return (videos || [])
        .filter(video =>
            video.site === "YouTube" &&
            /^[\w-]{6,20}$/.test(video.key || "") &&
            ["Trailer", "Teaser"].includes(video.type)
        )
        .sort((a, b) => rank(a) - rank(b))
        .filter(video => {
            if (seen.has(video.key)) return false;
            seen.add(video.key);
            return true;
        })
        .slice(0, 4);
}

function getSavedTrailerCandidate(movie) {
    if (typeof movie?.youtube_url !== "string") return null;

    try {
        const url = new URL(movie.youtube_url);
        const match = url.protocol === "https:"
            && url.hostname === "www.youtube-nocookie.com"
            ? url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})$/)
            : null;

        return match
            ? { key: match[1], site: "YouTube", type: "Trailer", official: true }
            : null;
    } catch {
        return null;
    }
}

function destroyTrailerPlayer() {
    // Invalidates any trailer that is still being mounted.
    trailerMountId++;

    if (trailerPlayer && typeof trailerPlayer.destroy === "function") {
        try {
            trailerPlayer.destroy();
        } catch (error) {
            console.warn("Unable to remove the trailer player:", error);
        }
    }

    trailerPlayer = null;
}

function showPosterFallback(media, panel, fallbackHTML, note = "") {
    panel.classList.remove("has-trailer");

    media.innerHTML = `${fallbackHTML}${
        note ? `<p class="modal-trailer-note">${note}</p>` : ""
    }`;
}

async function mountTrailer({ media, panel, candidates, fallbackHTML, title }) {
    destroyTrailerPlayer();

    const mountId = trailerMountId;
    const isStale = () => mountId !== trailerMountId;

    if (!candidates.length) {
        showPosterFallback(media, panel, fallbackHTML);
        return;
    }

    panel.classList.add("has-trailer");

    media.innerHTML = `
        <div class="modal-trailer-player">
            <div id="modal-trailer-frame"></div>
        </div>
    `;

    let YT = null;

    try {
        YT = await loadYouTubeApi();
    } catch (error) {
        console.warn("Using the basic YouTube embed:", error);
    }

    if (isStale()) return;

    // The player API is unavailable, so use a plain embed without error detection.
    if (!YT) {
        media.innerHTML = `
            <div class="modal-trailer-player">
                <iframe
                    src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(candidates[0].key)}?rel=0&modestbranding=1&playsinline=1"
                    title="${escapeHTML(title)} trailer"
                    allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen>
                </iframe>
            </div>
        `;
        return;
    }

    let index = 0;

    const playerVars = {
        rel: 0,
        modestbranding: 1,
        playsinline: 1
    };

    if (/^https?:$/.test(window.location.protocol)) {
        playerVars.origin = window.location.origin;
    }

    trailerPlayer = new YT.Player("modal-trailer-frame", {
        host: "https://www.youtube-nocookie.com",
        videoId: candidates[0].key,
        playerVars,
        events: {
            onError: () => {
                if (isStale()) return;

                index += 1;

                // This video cannot be embedded: try the next trailer, if any.
                if (index < candidates.length && trailerPlayer) {
                    trailerPlayer.cueVideoById(candidates[index].key);
                    return;
                }

                destroyTrailerPlayer();

                showPosterFallback(
                    media,
                    panel,
                    fallbackHTML,
                    "This trailer cannot be played here."
                );
            }
        }
    });

    const frame = media.querySelector("iframe");

    if (frame) {
        frame.title = `${title} trailer`;
    }
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

    const posterMarkup = poster
        ? `<img
            class="modal-poster"
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(details.title)} poster">`
        : `<div class="poster-placeholder">
            ${escapeHTML(details.title)}
        </div>`;

    // The embedded trailer replaces the poster; the poster is the fallback.
    const savedTrailer = getSavedTrailerCandidate(movie);
    const trailerCandidates = savedTrailer
        ? [savedTrailer]
        : getTrailerCandidates(details.videos?.results);

    mountTrailer({
        media,
        panel,
        candidates: trailerCandidates,
        fallbackHTML: posterMarkup,
        title: details.title || movie.title
    });

    const director = (details.credits?.crew || [])
        .find(person => person.job === "Director");

    const writers = (details.credits?.crew || [])
        .filter(person =>
            ["Screenplay", "Writer", "Story"].includes(person.job)
        )
        .slice(0, 3);

    const cast = details.credits?.cast || [];

    const genres = (details.genres || [])
        .map(genre => genre.name);

    const movieYear = details.release_date
        ? details.release_date.slice(0, 4)
        : String(movie.year || "N/A");

    const runtime = details.runtime
        ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
        : "Runtime unavailable";

    const watchlistMovie = {
        ...movie,
        id: String(details.id),
        title: details.title || movie.title,
        year: movieYear,
        rating: Number(details.vote_average ?? movie.rating ?? 0),
        genres: genres.length ? genres : (movie.genres || []),
        director: director?.name || movie.director || "",
        cast: cast.length ? cast.slice(0, 5).map(person => person.name) : (movie.cast || []),
        poster,
        backdrop,
        description: details.overview || movie.description
    };

    register([watchlistMovie]);

    body.innerHTML = `

        <div class="modal-main-details">
            <h2 id="modal-title">
                ${escapeHTML(details.title || movie.title)}
            </h2>

        <p class="modal-meta">
            ${escapeHTML(movieYear)}
            \u00B7 ${escapeHTML(runtime)}
            \u00B7 <span class="modal-rating">
                \u2605 ${formatRating(details.vote_average)}
            </span>
        </p>

        <div class="modal-tags">
            ${genres.map(genre => `
                <span class="tag">${escapeHTML(genre)}</span>
            `).join("")}
        </div>

        <p class="modal-description">
            ${escapeHTML(details.overview || "No synopsis available.")}
        </p>

        <div class="modal-credits">
            ${director
                ? `<p><span>Director</span>${escapeHTML(director.name)}</p>`
                : ""}
            ${writers.length
                ? `<p><span>Written by</span>
                    ${escapeHTML(writers.map(person => person.name).join(", "))}
                   </p>`
                : ""}
        </div>

            <div class="modal-actions">
                ${trailerCandidates.length
                    ? ""
                    : `<span class="modal-muted">No trailer available.</span>`}

                <button type="button" class="modal-watch"></button>
            </div>
        </div>

        <div class="modal-lower-sections">
            ${renderPersonalRating(watchlistMovie)}
            ${renderProviders(details.watch_providers)}
            ${renderCast(cast)}

            ${renderReviewSection(
                watchlistMovie.id,
                movie.mediaType === "tv" ? "tv" : "movie"
            )}

            ${renderRecommendations(details.recommendations?.results)}
        </div>
    `;

    loadMovieReviews(
        watchlistMovie.id,
        movie.mediaType === "tv" ? "tv" : "movie"
    );

    const button = body.querySelector(".modal-watch");

    updateWatchButton(button, watchlistMovie);

    button.dataset.movieId = watchlistMovie.id;
    button.addEventListener("click", async () => {
        if (button.disabled) return;

        button.disabled = true;

        try {
            await toggleWatchlist(watchlistMovie);
            updateWatchButton(button, watchlistMovie);
        } catch (error) {
            console.error("Watchlist update failed:", error);
            alert(error.message || "Unable to update your watchlist. Please try again.");
        } finally {
            button.disabled = false;
        }
    });

    refreshIcons();
}


async function openModal(movie) {
    const modal = getModal();

    if (!modal || !movie) return;

    lastFocused = document.activeElement;

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");

    if (!media || !body) return;

    destroyTrailerPlayer();

    modal.querySelector(".modal-panel")?.classList.remove("has-trailer");

    const requestId = ++modalRequestNumber;

    if (String(movie.id).startsWith("tmdb-") || String(movie.id).startsWith("movie-")) {
        const panel = modal.querySelector(".modal-panel");
        if (panel) {
            panel.style.setProperty("--modal-backdrop", movie.backdrop ? `url("${movie.backdrop}")` : "none");
        }
        renderMovieDetails(movie, {
            ...movie,
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster,
            backdrop_path: movie.backdrop,
            overview: movie.description,
            release_date: movie.year,
            vote_average: movie.rating,
            runtime: null,
            genres: (movie.genres || []).map(name => ({ name })),
            credits: {
                crew: movie.director ? [{ job: "Director", name: movie.director }] : [],
                cast: (movie.cast || []).map(person => ({
                    name: person.name,
                    profile_path: person.photo || null
                }))
            },
            videos: { results: [] },
            recommendations: { results: [] },
            watch_providers: null
        });
        showModal();
        return;
    }

    modal.hidden = true;

    try {
        const details = await fetchTMDB(
            movie.mediaType === "tv" ? "tv" : "movie",
            {
                id: movie.id
            }
        );

        if (requestId !== modalRequestNumber) {
            return;
        }

        const compatibleDetails = movie.mediaType === "tv"
            ? {
                ...details,
                title: details.name || movie.title,
                release_date: details.first_air_date,
                runtime: details.episode_run_time?.[0],
                watch_providers: null
            }
            : details;

        renderMovieDetails(movie, compatibleDetails);

        showModal();

    } catch (error) {
        if (requestId !== modalRequestNumber) return;

        console.error("Movie details error:", error);

        body.innerHTML = `
            <h2 id="modal-title">${escapeHTML(movie.title)}</h2>
            <p class="modal-muted">
                Unable to load the complete movie details.
                Please try again.
            </p>
        `;

        media.innerHTML = createPoster(movie);

        showModal();
    }
}



function closeModal() {
    const modal = getModal();

    if (!modal || modal.hidden) return;

    modalRequestNumber++;

    // Stop the trailer so it does not keep playing behind the closed modal.
    destroyTrailerPlayer();
    modal.querySelector(".modal-panel")?.classList.remove("has-trailer");

    const modalMedia = modal.querySelector(".modal-media");

    if (modalMedia) modalMedia.innerHTML = "";

    modal.hidden = true;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    modal.querySelector(".modal-panel")
        ?.style.removeProperty("--modal-backdrop");
    modal.querySelector(".modal-media").innerHTML = "";
    modal.querySelector(".modal-media").innerHTML = "";

    if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
    }
}

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const ratingButton = event.target.closest("[data-personal-rating]");

    if (!ratingButton) return;

    const movieId = ratingButton.dataset.ratingMovie;
    const rating = Number(ratingButton.dataset.personalRating);

    if (!movieId || rating < 1 || rating > 5) return;

    savePersonalRating(movieId, rating);

    const movie = getMovie(movieId);
    let updatedSection = null;

    if (movie) {
        const section = ratingButton.closest(".personal-rating-section");

        if (section) {
            section.outerHTML = renderPersonalRating(movie);
            updatedSection = Array.from(
                document.querySelectorAll(".personal-rating-section")
            ).find(element => element.dataset.ratingMovieSection === String(movieId));
        }
    }

    const label = updatedSection?.querySelector(".personal-rating-label");
    if (label) {
        label.textContent = "Saving your rating...";
    }

    savePersonalRatingToServer(movieId, rating).then(() => {
        if (label?.isConnected) {
            label.textContent = `Your rating: ${rating}/5`;
        }
    }).catch(error => {
        console.error("Movie rating could not be saved:", error);
        if (label?.isConnected) {
            label.textContent = "Saved on this device only; rating sync failed.";
        }
    });
});

/* HOME DATA STATE */

let catalogLoadError = "";
let localTrendingMovies = [];
let localTopRatedMovies = [];
let homeLoaded = false;

// Keep the rows in a loading state until the local catalog request finishes.

/* HOME CACHE (makes reloads instant) */

const HOME_CACHE_KEY = "cinemax-home-cache-v2";
const HOME_CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

function readHomeCache() {
    try {
        const cache = JSON.parse(localStorage.getItem(HOME_CACHE_KEY));

        if (!cache || Date.now() - cache.time > HOME_CACHE_MAX_AGE) {
            return null;
        }

        if (!Array.isArray(cache.trending) || !cache.trending.length) {
            return null;
        }

        if (!Array.isArray(cache.topRated)) {
            cache.topRated = [];
        }

        return cache;
    } catch {
        return null;
    }
}

function writeHomeCache(trending, topRated) {
    try {
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({
            time: Date.now(),
            trending,
            topRated
        }));
    } catch (error) {
        console.warn("Unable to cache home data:", error);
    }
}

/* HERO CAROUSEL */

// Starts empty so the sample movies never flash before the real ones.
let heroMovies = [];
let heroIndex = 0;
let heroTimer = null;

const heroImageCache = new Map();
let heroBuildNumber = 0;
let heroSlideRequest = 0;

function showHeroSkeleton() {
    const hero = $("cinemaShowcase");

    if (hero && !heroMovies.length) {
        hero.innerHTML = `
            <div class="hero-slide active hero-skeleton"
                 aria-busy="true"></div>
        `;
    }
}

function fallbackHero() {
    const featuredMovies = localCatalogMovies.length
        ? localCatalogMovies
        : [
        "truman-show",
        "dead-poets",
        "dark-knight",
        "inception",
        "titanic"
        ].map(getMovie).filter(Boolean);

    setHero(featuredMovies);
}

async function loadHeroTrailerData(movies) {
    const results = await Promise.allSettled(movies.map(async movie => {
        // Sample fallback IDs are slugs, not TMDB IDs.
        if (!/^\d+$/.test(id)) {
            heroTrailerStore.set(id, []);
            return;
        }

        try {
            // "videos" is the lightweight endpoint: trailers only.
            const details = await fetchTMDB(
                movie.mediaType === "tv" ? "tv" : "videos",
                { id: movie.id }
            );

            heroTrailerStore.set(
                id,
                getTrailerCandidates(details.videos?.results)
            );

            writeHeroTrailerCache(movies);
            onLoaded();
        } catch (error) {
            console.warn(`Unable to load trailer for ${movie.title}:`, error);
        }
    };

    // The first slide gets the bandwidth first.
    await load(movies[0]);
    await Promise.allSettled(movies.slice(1).map(load));
}

// Enables Play buttons and starts the on-screen slide's video once keys arrive.
function applyHeroTrailers(picks) {
    if (heroMovies !== picks) return;   // the hero was rebuilt in the meantime

    const hero = $("cinemaShowcase");
    if (!hero) return;

    const slides = hero.querySelectorAll(".hero-slide");

    picks.forEach((movie, index) => {
        const button = slides[index]?.querySelector(".hero-play-button");

        if (button && heroTrailers(movie).length) {
            button.disabled = false;
            button.removeAttribute("title");
        }
    });

    if (
        heroTrailers(picks[heroIndex]).length &&
        !heroBackgroundPlayers.has(heroIndex)
    ) {
        mountHeroBackgroundVideo(heroIndex);
    }
}

// Draws the hero right after the first backdrop is ready. Trailer data loads
// in the background and is applied to the slides when it arrives.
async function setHero(movies) {
    const picks = movies.slice(0, 5);

    if (!picks.length) return false;

    const key = picks.map(movie => movie.id).join(",");

    if (key === heroBuildKey) return true;
    heroBuildKey = key;

    if (picks[0].backdrop) {
        await preloadHeroImage(picks[0].backdrop);
    }

    // TMDB's trending list does not include video keys, so load the video
    // metadata for each featured title before rendering the carousel.
    await loadHeroTrailerData(picks);

    hydrateHeroTrailers(picks);
    heroMovies = picks;
    buildHero();

    loadHeroTrailerData(picks, () => applyHeroTrailers(picks));

    return true;
}

function preloadHeroImage(url) {
    if (!url) return Promise.resolve(false);

    if (heroImageCache.has(url)) {
        return heroImageCache.get(url);
    }

    const image = new Image();
    image.fetchPriority = "high";
    image.src = url;

    const loading = image.decode()
        .then(() => true)
        .catch(() => false);

    heroImageCache.set(url, loading);
    return loading;
}

async function preloadHeroImages(movies) {
    const firstMovie = movies.find(movie => movie.backdrop);

    if (!firstMovie) return true;

    const firstReady = await preloadHeroImage(firstMovie.backdrop);

    movies
        .filter(movie => movie !== firstMovie && movie.backdrop)
        .forEach(movie => preloadHeroImage(movie.backdrop));

    return firstReady;
}

let heroBackgroundPlayers = new Map();
let heroBackgroundRequest = 0;

function stopHeroBackgroundVideos() {
    // Invalidate any API load or player callback that is still in progress.
    heroBackgroundRequest++;

    for (const player of heroBackgroundPlayers.values()) {
        if (player && typeof player.destroy === "function") {
            try {
                player.destroy();
            } catch (error) {
                console.warn("Unable to stop hero background trailer:", error);
            }
        }
    }

    heroBackgroundPlayers.clear();

    const hero = $("cinemaShowcase");
    if (!hero) return;

    hero.querySelectorAll(".hero-video-background").forEach(container => {
        container.innerHTML = "";
        container.closest(".hero-slide")?.classList.remove("has-hero-trailer");
    });
}

async function mountHeroBackgroundVideo(index) {
    const hero = $("cinemaShowcase");
    const slide = hero?.querySelectorAll(".hero-slide")[index];
    const movie = heroMovies[index];
    const videoContainer = slide?.querySelector(".hero-video-background");
    const candidate = heroTrailers(movie)[0];

    if (!slide || !videoContainer) return;

    // Every slide change replaces the previous player, including a player
    // already mounted on this same slide. This prevents duplicate iframes.
    stopHeroBackgroundVideos();
    const requestId = ++heroBackgroundRequest;

    if (!candidate?.key || reducedMotion) return;

    try {
        const YT = await loadYouTubeApi();

        if (
            requestId !== heroBackgroundRequest ||
            !slide.isConnected ||
            !slide.classList.contains("active")
        ) {
            return;
        }

        const playerId = `hero-background-player-${requestId}`;
        videoContainer.innerHTML = `<div id="${playerId}"></div>`;

        const player = new YT.Player(playerId, {
            host: "https://www.youtube-nocookie.com",
            videoId: candidate.key,
            playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                loop: 1,
                modestbranding: 1,
                playsinline: 1,
                playlist: candidate.key,
                rel: 0,
                // Start a little into the preview to skip the opening rating card.
                // The separate Play button still opens the trailer from the beginning.
                start: 7,
                ...( /^https?:$/.test(window.location.protocol)
                    ? { origin: window.location.origin }
                    : {} )
            },
            events: {
                onReady: event => {
                    if (
                        requestId !== heroBackgroundRequest ||
                        !slide.isConnected ||
                        !slide.classList.contains("active")
                    ) {
                        event.target.destroy();
                        return;
                    }

                    heroBackgroundPlayers.set(index, event.target);
                    event.target.mute();
                    event.target.setVolume(0);
                    event.target.seekTo(7, true);
                    event.target.playVideo();
                    slide.classList.add("has-hero-trailer");
                },
                onStateChange: event => {
                    if (requestId !== heroBackgroundRequest) return;

                    if (event.data === YT.PlayerState.PLAYING) {
                        // Keep the cinematic preview muted even after a browser
                        // or player state change.
                        event.target.mute();
                    } else if (event.data === YT.PlayerState.ENDED) {
                        // The playlist parameter normally handles looping;
                        // this is an additional single-video fallback.
                        event.target.seekTo(7, true);
                        event.target.playVideo();
                    }
                },
                onError: event => {
                    if (requestId !== heroBackgroundRequest) return;

                    console.warn(
                        `Hero trailer unavailable for ${movie.title}:`,
                        event.data
                    );

                    const currentPlayer = heroBackgroundPlayers.get(index);
                    if (currentPlayer === event.target) {
                        heroBackgroundPlayers.delete(index);
                    }

                    try {
                        event.target.destroy();
                    } catch (error) {
                        console.warn("Unable to remove failed hero trailer:", error);
                    }

                    videoContainer.innerHTML = "";
                    slide.classList.remove("has-hero-trailer");
                }
            }
        });

        // Store it immediately so a slide change can destroy it before onReady.
        heroBackgroundPlayers.set(index, player);
    } catch (error) {
        if (requestId !== heroBackgroundRequest) return;

        console.warn(
            `Hero background trailer could not be started for ${movie.title}:`,
            error
        );

        videoContainer.innerHTML = "";
        slide.classList.remove("has-hero-trailer");
    }
}

function openHeroTrailer(movie) {
    const candidate = heroTrailers(movie)[0];

    if (!candidate?.key) {
        return;
    }

    closeHeroTrailer();

    const overlay = document.createElement("div");
    overlay.className = "hero-trailer-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", `${movie.title} trailer`);

    const embedUrl = new URL(
        `https://www.youtube-nocookie.com/embed/${encodeURIComponent(candidate.key)}`
    );
    embedUrl.search = new URLSearchParams({
        autoplay: "1",
        controls: "1",
        playsinline: "1",
        rel: "0",
        modestbranding: "1"
    }).toString();

    overlay.innerHTML = `
        <div class="hero-trailer-dialog">
            <button type="button"
                    class="hero-trailer-close"
                    data-close-hero-trailer
                    aria-label="Close trailer">&times;</button>
            <div class="hero-trailer-frame">
                <iframe
                    src="${escapeHTML(embedUrl.toString())}"
                    title="${escapeHTML(movie.title)} official trailer"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;

    overlay.addEventListener("click", event => {
        if (event.target === overlay || event.target.closest("[data-close-hero-trailer]")) {
            closeHeroTrailer();
        }
    });

    document.body.appendChild(overlay);
    document.body.classList.add("hero-trailer-open");
    overlay.querySelector("[data-close-hero-trailer]")?.focus();
}

function closeHeroTrailer() {
    document.querySelector(".hero-trailer-overlay")?.remove();
    document.body.classList.remove("hero-trailer-open");
}

function buildHero() {
    const hero = $("cinemaShowcase");
    const dots = $("dots");

    if (!hero || !dots || !heroMovies.length) return;

    const buildNumber = ++heroBuildNumber;
    clearInterval(heroTimer);
    stopHeroBackgroundVideos();

    heroIndex = 0;
    heroSlideRequest++;

    hero.innerHTML = heroMovies.map((movie, index) => {
        const hasTrailer = Boolean(heroTrailers(movie).length);
        return `
            <div class="hero-slide ${index === 0 ? "active" : ""}"
                 ${movie.backdrop
                    ? `style="--hero-backdrop:url('${escapeHTML(movie.backdrop)}')"`
                    : ""}
                 aria-hidden="${index === 0 ? "false" : "true"}">

                <div class="hero-video-background" aria-hidden="true"></div>

                <div class="hero-content">
                    <p class="hero-label">Featured film</p>

                    <h1>${escapeHTML(movie.title)}</h1>

                    <p class="hero-description">
                        ${escapeHTML(movie.description)}
                    </p>

                    <p class="hero-meta">
                        ${escapeHTML(movie.year)}
                        \u00B7 \u2605 ${formatRating(movie.rating)}
                        ${movie.genres.length
                            ? " \u00B7 " + escapeHTML(movie.genres.slice(0, 3).join(", "))
                            : ""}
                    </p>

                    <div class="hero-actions">
                        <button type="button"
                                class="hero-button hero-play-button"
                                data-play-hero-trailer="${escapeHTML(movie.id)}"
                                ${hasTrailer ? "" : "disabled title=\"Trailer unavailable\""}>
                            <i data-lucide="play" aria-hidden="true"></i>
                            <span>Play</span>
                        </button>

                        <button type="button"
                                class="hero-button hero-button-secondary"
                                data-open-movie="${escapeHTML(movie.id)}">
                            Explore
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("") + `
        <button type="button"
                class="hero-arrow prev"
                data-hero-nav="-1"
                aria-label="Previous featured movie">
            <i data-lucide="chevron-left"></i>
        </button>

        <button type="button"
                class="hero-arrow next"
                data-hero-nav="1"
                aria-label="Next featured movie">
            <i data-lucide="chevron-right"></i>
        </button>
    `;

    dots.innerHTML = heroMovies.map((_, index) => `
        <button type="button"
                class="hero-dot ${index === 0 ? "active" : ""}"
                data-slide="${index}"
                aria-current="${index === 0 ? "true" : "false"}"
                aria-label="Go to film ${index + 1}">
        </button>
    `).join("");

    const slides = [...hero.querySelectorAll(".hero-slide")];

    heroMovies.forEach(async (movie, index) => {
        const slide = slides[index];
        if (!slide) return;

        const ready = movie.backdrop
            ? await preloadHeroImage(movie.backdrop)
            : true;

        if (buildNumber !== heroBuildNumber || !slide.isConnected) return;

        // Show the text even if the static backdrop failed to load; the video
        // background (when available) can still provide the hero artwork.
        slide.classList.add("backdrop-ready");

        if (!ready && movie.backdrop) {
            console.warn(`Backdrop unavailable for ${movie.title}`);
        }
    });

    mountHeroBackgroundVideo(0);
    refreshIcons();
    startHeroTimer();
}

async function showHeroSlide(index) {
    const hero = $("cinemaShowcase");
    const dots = $("dots");
    const count = heroMovies.length;

    if (!hero || !dots || !count) return;

    const request = ++heroSlideRequest;
    const nextIndex = (index + count) % count;
    const movie = heroMovies[nextIndex];
    const slide = hero.querySelectorAll(".hero-slide")[nextIndex];

    if (!slide) return;

    const ready = movie.backdrop
        ? await preloadHeroImage(movie.backdrop)
        : true;

    if (request !== heroSlideRequest || !slide.isConnected) return;

    slide.classList.add("backdrop-ready");

    if (!ready && movie.backdrop) {
        console.warn(`Backdrop unavailable for ${movie.title}`);
    }

    heroIndex = nextIndex;

    hero.querySelectorAll(".hero-slide").forEach((item, i) => {
        item.classList.toggle("active", i === heroIndex);
        item.setAttribute("aria-hidden", String(i !== heroIndex));
    });

    dots.querySelectorAll(".hero-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === heroIndex);
        dot.setAttribute("aria-current", String(i === heroIndex));
    });

    // Stop the previous background trailer and start the newly active one.
    mountHeroBackgroundVideo(heroIndex);
}

function startHeroTimer() {
    clearInterval(heroTimer);

    if (reducedMotion || heroMovies.length < 2) {
        return;
    }

    heroTimer = setInterval(() => {
        showHeroSlide(heroIndex + 1);
    }, 6000);
}

const heroSection = document.querySelector(".hero-section");

if (heroSection) {
    heroSection.addEventListener("mouseenter", () => {
        clearInterval(heroTimer);
    });

    heroSection.addEventListener("mouseleave", startHeroTimer);

    heroSection.addEventListener("focusin", () => {
        clearInterval(heroTimer);
    });

    heroSection.addEventListener("focusout", startHeroTimer);
}

/* CONTINUE WATCHING */

const continueWatching = [
    { title: "The Dark Knight", year: 2008, progress: 65 },
    { title: "The Truman Show", year: 1998, progress: 35 },
    { title: "Inception", year: 2010, progress: 80 }
];

const CONTINUE_CACHE_KEY = "cinemax-continue-cache-v1";
const CONTINUE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function readContinueCache() {
    try {
        const cache = JSON.parse(localStorage.getItem(CONTINUE_CACHE_KEY));

        if (
            !cache ||
            Date.now() - cache.time > CONTINUE_CACHE_MAX_AGE ||
            !Array.isArray(cache.items) ||
            !cache.items.length
        ) {
            return null;
        }

        return cache.items;
    } catch {
        return null;
    }
}

function writeContinueCache(items) {
    try {
        localStorage.setItem(CONTINUE_CACHE_KEY, JSON.stringify({
            time: Date.now(),
            items
        }));
    } catch (error) {
        console.warn("Unable to cache Continue Watching:", error);
    }
}

const loadingHTML = text => `
    <p class="no-results">${escapeHTML(text)}</p>
`;

function paintContinueWatching(container, items) {
    container.innerHTML = items.map(item =>
        createContinueCard(item.movie, item.progress)
    ).join("");
}

async function renderContinueWatching() {
    const container = $("continue-movies");

    if (!container) return;

    const available = continueWatching
        .map(item => {
            const movie = localCatalogMovies.find(candidate =>
                candidate.title.toLowerCase() === item.title.toLowerCase()
            );
            return movie ? { movie, progress: item.progress } : null;
        })
        .filter(Boolean);

    if (available.length) {
        paintContinueWatching(container, available);
    } else {
        container.innerHTML = loadingHTML("No matching locally cataloged movies are available.");
    }
}

/* HOME ROWS */

function renderTrending() {
    const container = $("trending");

    if (!container) return;

    if (!localTrendingMovies.length && !homeLoaded) {
        container.innerHTML = loadingHTML("Loading trending movies...");
        return;
    }

    const pool = localTrendingMovies;

    if (!pool.length) {
        container.innerHTML = loadingHTML(
            catalogLoadError || "No movies have been added to the local catalog yet."
        );
        return;
    }

    container.innerHTML = [...pool]
        .slice(0, 12)
        .map(movie => createBackdropCard(movie))
        .join("");
}

function renderTopRated() {
    const container = $("rank");

    if (!container) return;

    if (!localTopRatedMovies.length && !homeLoaded) {
        container.innerHTML = `<li>${loadingHTML("Loading top rated movies...")}</li>`;
        return;
    }

    const pool = localTopRatedMovies;

    if (!pool.length) {
        container.innerHTML = `<li>${loadingHTML(
            catalogLoadError || "No movies have been added to the local catalog yet."
        )}</li>`;
        return;
    }

    container.innerHTML = [...pool]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10)
        .map((movie, index) => createTopCard(movie, index + 1))
        .join("");
}

function renderWatchlist() {
    const container = $("watchlist-movies");
    const empty = $("empty-watchlist");

    if (!container) return;

    const saved = getWatchlist();

    container.innerHTML = saved.map(movie =>
        createMovieCard(movie, `
            <button type="button"
                    class="remove-watchlist"
                    data-remove-watchlist="${escapeHTML(movie.id)}">
                Remove from Watchlist
            </button>
        `)
    ).join("");

    if (empty) {
        empty.hidden = saved.length > 0;
    }
}

document.addEventListener("watchlist:change", () => {
    renderWatchlist();

    const modalButton = document.querySelector(".modal-watch");
    if (modalButton?.dataset.movieId) {
        updateWatchButton(modalButton, { id: modalButton.dataset.movieId });
    }
});

/* SEARCH */

const searchInput = $("homepage-search");
const resultsSection = $("search-results-section");
const resultsBox = $("search-results");
const resultsTitle = $("search-title");
const homepageContainer = document.querySelector(".homepage-container");

let requestNumber = 0;
let searchTimer = null;

function setSearchMode(enabled) {
    if (!homepageContainer) return;

    homepageContainer.classList.toggle("is-searching", enabled);

    if (resultsSection) {
        resultsSection.hidden = !enabled;
    }
}

function showResults(title, html) {
    if (!resultsSection || !resultsBox) return;

    if (resultsTitle) {
        resultsTitle.textContent = title;
    }

    resultsBox.innerHTML = html;
    resultsSection.hidden = false;
}


function createSearchResultCard(movie) {
    // Prefer a wide TMDB backdrop for the Netflix-style landscape thumbnail.
    const image = movie.backdropSmall || movie.backdrop || movie.poster || "";

    const releaseDate = movie.releaseDate
        ? new Date(`${movie.releaseDate}T00:00:00`).toLocaleDateString(
            undefined,
            { year: "numeric", month: "short", day: "numeric" }
        )
        : (movie.year && movie.year !== "N/A"
            ? String(movie.year)
            : "Release date unavailable");

    const genres = Array.isArray(movie.genres) && movie.genres.length
        ? movie.genres.slice(0, 2).join(", ")
        : "Genre unavailable";

    const rating = Number(movie.rating) > 0
        ? `★ ${formatRating(movie.rating)}`
        : "Not rated";

    return `
        <a href="#" class="search-result-card"
           data-open-movie="${escapeHTML(movie.id)}"
           aria-label="View details for ${escapeHTML(movie.title)}">
            <div class="search-result-poster">
                ${image
                    ? `<img src="${escapeHTML(image)}"
                            alt="${escapeHTML(movie.title)}"
                            loading="lazy">`
                    : `<div class="search-result-poster-fallback">${escapeHTML(movie.title)}</div>`}
            </div>

            <div class="search-result-info">
                <h3 class="search-result-title">${escapeHTML(movie.title)}</h3>
                <div class="search-result-meta">
                    <span>${escapeHTML(releaseDate)}</span>
                    <span class="search-result-separator">•</span>
                    <span>${escapeHTML(genres)}</span>
                    <span class="search-result-separator">•</span>
                    <span class="search-result-rating">${escapeHTML(rating)}</span>
                </div>
            </div>
        </a>
    `;
}

function clearResults() {
    requestNumber++;
    clearTimeout(searchTimer);

    setSearchMode(false);

    if (resultsBox) {
        resultsBox.innerHTML = "";
    }

    if (searchInput) {
        searchInput.value = "";
    }
}

async function performSearch(query) {
    const term = query.trim();

    if (!term) {
        clearResults();
        return;
    }

    const current = ++requestNumber;

    setSearchMode(true);

    const foundMovies = localCatalogMovies.filter(movie => {
        const searchText = [
            movie.title,
            movie.description,
            ...(movie.genres || []),
            movie.director,
            ...(movie.cast || []).map(person => person.name)
        ].join(" ").toLowerCase();

        return searchText.includes(term.toLowerCase());
    });

    if (current !== requestNumber) return;

    showResults(
        "Search Results",
        foundMovies.length
            ? `<p class="search-results-count">${foundMovies.length} local movies found for "${escapeHTML(term)}"</p>${foundMovies.map(createMovieCard).join("")}`
            : `<div class="empty-state"><h3>No Movies Found</h3><p>No local catalog movies match "${escapeHTML(term)}".</p></div>`
    );

    try {
        const movieData = await fetchTMDB("search", {
            query: term
        });

        if (current !== requestNumber) return;

        const foundMovies = register(
            (movieData.results || [])
                .map(normalizeTMDBMovie)
                .filter(Boolean)
        );

        if (!foundMovies.length) {
            showResults(
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

        showResults(
            "Search Results",
            `
                <p class="search-results-count">
                    ${foundMovies.length} movies found for
                    "${escapeHTML(term)}"
                </p>

                ${foundMovies.map(createSearchResultCard).join("")}
            `
        );
    } catch (error) {
        if (current !== requestNumber) return;

        console.error("TMDB search error:", error);

        showResults(
            "Search Unavailable",
            loadingHTML("Unable to search right now. Please try again.")
        );
    }

}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        const query = searchInput.value.trim();

        if (!query) {
            clearResults();
            return;
        }

        setSearchMode(true);

        searchTimer = setTimeout(() => {
            performSearch(query);
        }, 300);
    });
}

/* GLOBAL CLICK + KEYBOARD HANDLERS */

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const target = event.target;

    const playHeroButton = target.closest("[data-play-hero-trailer]");
    if (playHeroButton) {
        const movie = getMovie(playHeroButton.dataset.playHeroTrailer);
        if (heroTrailers(movie).length) {
            event.preventDefault();
            openHeroTrailer(movie);
        }
        return;
    }

    const closeHeroButton = target.closest("[data-close-hero-trailer]");
    if (closeHeroButton) {
        closeHeroTrailer();
        return;
    }

    const openButton = target.closest("[data-open-movie]");

    if (openButton) {
        event.preventDefault();
        openModal(getMovie(openButton.dataset.openMovie));
        return;
    }

    if (target.closest("[data-close-modal]")) {
        closeModal();
        return;
    }

    const rowButton = target.closest(".row-control");

    if (rowButton) {
        const row = $(rowButton.dataset.row);

        if (row) {
            row.scrollBy({
                left: Number(rowButton.dataset.dir) * row.clientWidth * 0.85,
                behavior: reducedMotion ? "auto" : "smooth"
            });
        }

        return;
    }

    const heroNav = target.closest("[data-hero-nav]");

    if (heroNav) {
        showHeroSlide(heroIndex + Number(heroNav.dataset.heroNav));
        startHeroTimer();
        return;
    }

    const dot = target.closest("[data-slide]");

    if (dot) {
        showHeroSlide(Number(dot.dataset.slide));
        startHeroTimer();
        return;
    }

    const deleteReviewButton = target.closest("[data-delete-review]");

    if (deleteReviewButton) {
        deleteMovieReview(deleteReviewButton);
        return;
    }

    const removeButton = target.closest("[data-remove-watchlist]");

    if (removeButton) {
        removeButton.disabled = true;

        removeFromWatchlist(removeButton.dataset.removeWatchlist)
            .catch(error => {
                console.error("Unable to remove movie from watchlist:", error);
                alert(error.message || "Unable to update your watchlist. Please try again.");
            })
            .finally(() => {
                removeButton.disabled = false;
            });

        return;
    }

    if (target.closest("[data-clear-search]")) {
        clearResults();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (document.querySelector(".hero-trailer-overlay")) {
            closeHeroTrailer();
        } else {
            closeModal();
        }
        return;
    }

    const modal = getModal();

    if (event.key !== "Tab" || !modal || modal.hidden) return;

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

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

/* NAV SECTION HIGHLIGHT */

function watchSections() {
    const links = [
        ...document.querySelectorAll(".homepage-nav a[data-section]")
    ];

    const sections = links
        .map(link => $(link.dataset.section))
        .filter(Boolean);

    if (!links.length || !("IntersectionObserver" in window)) return;

    const setActive = id => {
        links.forEach(link => {
            if (link.dataset.section === id) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    };

    setActive("home");

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setActive(entry.target.id);
            }
        });
    }, {
        rootMargin: "-30% 0px -60% 0px"
    });

    sections.forEach(section => observer.observe(section));
}

/* LOAD LIVE TMDB DATA */
async function loadTMDB() {
    console.log("Starting TMDB homepage data load...");

    const trendingRequest = fetchTMDB("trending");
    const topRatedRequest = fetchTMDB("top-rated");

    // Start the hero as soon as trending arrives, not after top rated too.
    trendingRequest
        .then(data => {
            const results = data?.results;

            if (!Array.isArray(results) || heroMovies.length) return;

            return setHero(
                register(results.map(normalizeTMDBMovie).filter(Boolean))
            );
        })
        .catch(() => {});

    const [trendingResult, topRatedResult] = await Promise.allSettled([
        trendingRequest,
        topRatedRequest
    ]);

    // TRENDING MOVIES
    if (trendingResult.status === "fulfilled") {
        const results = trendingResult.value?.results;

        if (!Array.isArray(results)) {
            console.error(
                "Trending response has an unexpected structure:",
                trendingResult.value
            );
        } else {
            tmdbTrending = register(
                results
                    .map(normalizeTMDBMovie)
                    .filter(Boolean)
                    .map(movie => ({
                        ...movie,
                        trending: true
                    }))
            );
        }
    } else {
        console.error(
            "Trending movies could not be loaded:",
            trendingResult.reason
        );
    }

    // TOP RATED MOVIES
    if (topRatedResult.status === "fulfilled") {
        const results = topRatedResult.value?.results;

        if (!Array.isArray(results)) {
            console.error(
                "Top Rated response has an unexpected structure:",
                topRatedResult.value
            );
        } else {
            tmdbTopRated = register(
                results
                    .map(normalizeTMDBMovie)
                    .filter(Boolean)
                    .map(movie => ({
                        ...movie,
                        topRated: true
                    }))
            );
        }
    } else {
        console.error(
            "Top Rated movies could not be loaded:",
            topRatedResult.reason
        );
    }

    // LOG RESULTS
    console.log("Trending movies loaded:", tmdbTrending.length);
    console.log("Top Rated movies loaded:", tmdbTopRated.length);

    // CACHE AVAILABLE DATA
    if (tmdbTrending.length && tmdbTopRated.length) {
        writeHomeCache(tmdbTrending, tmdbTopRated);
    }

    // RENDER HOMEPAGE ROWS
    homeLoaded = true;

    renderTrending();
    renderTopRated();

    // Use the Admin collection for featured slides when available.
    const featuredMovies = localCatalogMovies.length ? localCatalogMovies : tmdbTrending;
    if (featuredMovies.length) {
        setHero(featuredMovies);
    } else if (!heroMovies.length) {
        fallbackHero();
    }

    // ERROR STATUS
    const failures = [trendingResult, topRatedResult]
        .filter(result => result.status === "rejected")
        .map(result => result.reason);

    const status = $("movie-service-status");

    if (status) {
        if (failures.length) {
            const missingKey = failures.some(error =>
                String(error?.message || error).includes(
                    "TMDB_API_KEY is not configured."
                )
            );

            status.textContent = missingKey
                ? "Live movie data is unavailable. Check your TMDB API configuration."
                : "Some live movie data could not be loaded. Showing available previews.";

            status.hidden = false;
        } else {
            status.hidden = true;
        }
    }

    console.log("TMDB homepage loading finished.");

}

async function loadMoviesCatalog() {
    const catalogIds = ["popular-movies", "horror-movies", "comedy-movies"];
    catalogIds.forEach(id => {
        const container = $(id);
        if (container) container.innerHTML = loadingHTML("Loading CineMax Collection...");
    });

    try {
        const response = await fetch("../06 - Admin/admin_movies_api.php", {
            credentials: "same-origin",
            cache: "no-store"
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.movies)) {
            throw new Error(data.error || "Unable to load CineMax Collection.");
        }

        const movies = register(data.movies.map(movie => ({
            ...movie,
            id: String(movie.id),
            rating: Number(movie.rating || 0),
            genres: Array.isArray(movie.genres) ? movie.genres : [],
            cast: Array.isArray(movie.cast) ? movie.cast : [],
            poster: movie.poster || "",
            backdrop: movie.backdrop || movie.poster || "",
            backdropSmall: movie.backdropSmall || movie.poster || "",
            description: movie.description || "No description available.",
            mediaType: "movie"
        })));

        const popular = movies.filter(movie => Number(movie.rating) > 0)
            .sort((first, second) => Number(second.rating) - Number(first.rating));
        renderBackdropRow("popular-movies", popular,
            "No rated movies have been added to the CineMax Collection yet.");
        renderBackdropRow("horror-movies",
            movies.filter(movie => movie.genres.some(genre => String(genre).toLowerCase() === "horror")),
            "No horror movies have been added to the CineMax Collection yet.");
        renderBackdropRow("comedy-movies",
            movies.filter(movie => movie.genres.some(genre => String(genre).toLowerCase() === "comedy")),
            "No comedy movies have been added to the CineMax Collection yet.");
        refreshIcons();
    } catch (error) {
        console.error("Unable to load movie collection rows:", error);
        catalogIds.forEach(id => renderBackdropRow(
            id,
            [],
            "CineMax Collection could not be loaded."
        ));
    }
}

const catalogTitles = {
    "new-releases": "New Releases",
    "top-rated-movies": "Top Rated / Critically Acclaimed Movies",
    "award-winners": "Award Winners",
    "action-adventure": "Action and Adventure",
    "sci-fi-fantasy": "Sci-Fi and Fantasy",
    "romance-movies": "Romance",
    "thriller-mystery": "Thriller and Mystery",
    "drama-movies": "Drama",
    "animation-family": "Animation and Family",
    "documentary-movies": "Documentary",
    "crime-movies": "Crime"
};

function catalogTitle(id) { return catalogTitles[id] || id; }

function createCatalogSection(id, title) {
    return `<section class="content-section catalog-row-section"><div class="section-header"><h2>${escapeHTML(title)}</h2><div class="row-controls"><button type="button" class="row-control" data-row="${id}" data-dir="-1" aria-label="Scroll ${escapeHTML(title)} left"><i data-lucide="chevron-left"></i></button><button type="button" class="row-control" data-row="${id}" data-dir="1" aria-label="Scroll ${escapeHTML(title)} right"><i data-lucide="chevron-right"></i></button></div></div><div class="movie-row backdrop-row" id="${id}" aria-label="${escapeHTML(title)}"></div></section>`;
}

const REMINDERS_KEY = "cinemax-release-reminders";
function getReminders() { try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]"); } catch { return []; } }
function isReminderSaved(id) { return getReminders().some(reminder => String(reminder.id) === String(id)); }

document.addEventListener("click", event => {
    const button = event.target.closest("[data-remind-movie]");
    if (!button) return;
    event.preventDefault();
    const id = String(button.dataset.remindMovie);
    const reminders = getReminders();
    if (!reminders.some(reminder => String(reminder.id) === id)) {
        const movie = getMovie(id);
        reminders.push({ id, title: movie?.title || "Upcoming movie", releaseDate: movie?.releaseDate || "" });
        try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders)); } catch (error) { console.warn("Unable to save release reminder:", error); }
    }
    button.textContent = "Reminder saved";
    button.classList.add("is-saved");
    button.setAttribute("aria-pressed", "true");
});


/* INITIALIZE PAGE */

renderWatchlist();
if (!adminMode) {
    loadWatchlist().catch(error => {
        console.error("Unable to load the account watchlist:", error);
    });
}
watchSections();
showHeroSkeleton();

const hasHomeMovieRows = $("trending") && $("rank");
if (hasHomeMovieRows) {
    const cachedHome = readHomeCache();
    if (cachedHome) {
        tmdbTrending = register(cachedHome.trending);
        tmdbTopRated = register(cachedHome.topRated);
        setHero(tmdbTrending);
    }
    renderTrending();
    renderTopRated();
    loadTMDB();
} else if ($("popular-movies")) {
    loadMoviesCatalog();
}

refreshIcons();








loadAdminMovies();
