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

        "'": "'"

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

    genre = null,

    id = null

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

    if (id !== null) {

        parameters.set("id", String(id));

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
    const image = movie.backdropSmall || movie.backdrop || movie.poster || "";
    const releaseYear = movie.year && movie.year !== "N/A"
        ? String(movie.year)
        : "Release date unavailable";
    const genreText = (movie.genres || []).slice(0, 2).join(", ") || "Genre unavailable";
    const ratingText = Number(movie.rating) > 0
        ? `★ ${formatRating(movie.rating)}`
        : "Not rated";

    return `
        <article class="genre-search-card">
            <a
                href="#"
                class="genre-search-open"
                data-open-movie="${escapeHTML(movie.id)}"
                aria-label="View details for ${escapeHTML(movie.title)}"
            >
                <div class="genre-search-image">
                    ${image
                        ? `<img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(movie.title)}"
                                loading="lazy"
                           >`
                        : `<div class="genre-search-placeholder">${escapeHTML(movie.title)}</div>`
                    }
                </div>

                <div class="genre-search-info">
                    <h3 class="genre-search-title">${escapeHTML(movie.title)}</h3>
                    <p class="genre-search-meta">
                        <span>${escapeHTML(releaseYear)}</span>
                        <span class="genre-search-separator">•</span>
                        <span>${escapeHTML(genreText)}</span>
                        <span class="genre-search-separator">•</span>
                        <span class="genre-search-rating">${escapeHTML(ratingText)}</span>
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
        !image.closest(".genre-search-image, .movie-poster")
    ) {
        return;
    }

    const placeholder = document.createElement("div");
    const isGenreSearchImage = Boolean(image.closest(".genre-search-image"));

    placeholder.className = isGenreSearchImage
        ? "genre-search-placeholder"
        : "poster-placeholder";
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

        if ($("genres-toolbar")) $("genres-toolbar").hidden = false;

    }

    if (resultsSection) {

        resultsSection.hidden = true;

    }

}

function showMovieResults() {

    if (genreList) {

        genreList.hidden = true;

        if ($("genres-toolbar")) $("genres-toolbar").hidden = true;

    }

    if (resultsSection) {

        resultsSection.hidden = false;

    }

}

/* GENRE CARDS */

const GENRE_ICONS = {
    "Action": "swords",
    "Adventure": "compass",
    "Animation": "palette",
    "Comedy": "laugh",
    "Crime": "siren",
    "Documentary": "video",
    "Drama": "drama",
    "Family": "users",
    "Fantasy": "wand-sparkles",
    "History": "landmark",
    "Horror": "ghost",
    "Music": "music",
    "Mystery": "fingerprint",
    "Romance": "heart",
    "Science Fiction": "rocket",
    "TV Movie": "tv",
    "Thriller": "zap",
    "War": "shield",
    "Western": "mountain"
};

function renderGenres() {
    const container = genreList;
    if (!container) return;

    const count = $("genres-count");

    if (!genres.length) {
        if (count) count.textContent = "";
        container.innerHTML = loadingHTML(
            "No genres are available right now."
        );
        return;
    }

    if (count) {
        count.textContent = `${genres.length} genres`;
    }

    container.innerHTML = genres.map((genre, index) => `
        <button
            type="button"
            class="genre-card"
            style="--i: ${index}"
            data-genre="${Number(genre.id)}"
            aria-pressed="false"
        >
            <span class="genre-card-icon" aria-hidden="true">
                <i data-lucide="${GENRE_ICONS[genre.name] || "film"}"></i>
            </span>
            <span class="genre-card-text">
                <span class="genre-card-name">${escapeHTML(genre.name)}</span>
                <span class="genre-card-cta">Browse movies</span>
            </span>
            <i class="genre-card-arrow" data-lucide="arrow-up-right" aria-hidden="true"></i>
        </button>
    `).join("");

    refreshIcons();
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

        const message = error.message === "TMDB_API_KEY is not configured."

            ? "Copy tmdb_config.example.php to tmdb_config.php and add your TMDB API key to load genres."

            : "Unable to load genres. Please try again later.";

        genreList.innerHTML = loadingHTML(

            message

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
let modalRequestNumber = 0;

function getModal() {
    return $("movie-modal");
}

function showModal() {
    const modal = getModal();

    if (!modal) return;

    modal.hidden = false;
    // homepage.css only shows the modal when it has the "active" class.
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    modal.querySelector(".modal-close")?.focus();

    refreshIcons();
}

function getTrailerKey(videos) {
    const rank = video =>
        (video.type === "Trailer" ? 0 : 2) + (video.official ? 0 : 1);

    const candidates = (videos || [])
        .filter(video =>
            video.site === "YouTube" &&
            /^[\w-]{6,20}$/.test(video.key || "") &&
            ["Trailer", "Teaser"].includes(video.type)
        )
        .sort((a, b) => rank(a) - rank(b));

    return candidates[0]?.key || "";
}

function modalBodyHTML(movie, details) {
    const d = details || {};

    const title = d.title || movie.title;

    const year = d.release_date
        ? d.release_date.slice(0, 4)
        : movie.year;

    const runtime = d.runtime
        ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
        : "";

    const rating = d.vote_average ?? movie.rating;

    const genreList = d.genres
        ? d.genres.map(genre => genre.name)
        : (movie.genres || []);

    const overview = d.overview || movie.description || "No synopsis available.";

    const director = (d.credits?.crew || [])
        .find(person => person.job === "Director");

    const cast = (d.credits?.cast || []).slice(0, 12);

    const recommendations = register(
        (d.recommendations?.results || [])
            .map(normalizeTMDBMovie)
            .filter(Boolean)
    ).slice(0, 8);

    const metaParts = [escapeHTML(year)];

    if (runtime) metaParts.push(escapeHTML(runtime));

    metaParts.push(
        `<span class="modal-rating">\u2605 ${formatRating(rating)}</span>`
    );

    return `
        <h2 id="modal-title">${escapeHTML(title)}</h2>

        <p class="modal-meta">${metaParts.join(" \u00B7 ")}</p>

        <div class="modal-tags">
            ${genreList.map(genre => `
                <span class="tag">${escapeHTML(genre)}</span>
            `).join("")}
        </div>

        <p class="modal-description">${escapeHTML(overview)}</p>

        ${director ? `
            <div class="modal-credits">
                <p><span>Director</span>${escapeHTML(director.name)}</p>
            </div>
        ` : ""}

        ${cast.length ? `
            <section class="modal-section">
                <h3>Cast</h3>
                <div class="modal-cast-grid">
                    ${cast.map(person => `
                        <article class="modal-cast-item">
                            ${person.profile_path
                                ? `<img
                                    src="${TMDB_IMAGE_BASE}w185${escapeHTML(person.profile_path)}"
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
        ` : ""}

        ${recommendations.length ? `
            <section class="modal-section">
                <h3>More Like This</h3>
                <div class="modal-recommendations">
                    ${recommendations.map(item => `
                        <button
                            type="button"
                            class="recommendation-card"
                            data-open-movie="${escapeHTML(item.id)}">
                            ${item.poster
                                ? `<img
                                    src="${escapeHTML(item.poster)}"
                                    alt="${escapeHTML(item.title)} poster"
                                    loading="lazy">`
                                : `<div class="poster-placeholder">
                                    ${escapeHTML(item.title)}
                                </div>`}
                            <span>${escapeHTML(item.title)}</span>
                            <small>${escapeHTML(item.year)}</small>
                        </button>
                    `).join("")}
                </div>
            </section>
        ` : ""}
    `;
}

async function openModal(movie) {
    const modal = getModal();

    if (!modal || !movie) return;

    lastFocused = document.activeElement;

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");
    const panel = modal.querySelector(".modal-panel");

    if (!media || !body || !panel) return;

    const requestId = ++modalRequestNumber;

    // Show what we already know right away; the full details follow.
    panel.classList.remove("has-trailer");
    panel.style.setProperty(
        "--modal-backdrop",
        movie.backdrop ? `url("${movie.backdrop}")` : "none"
    );

    media.innerHTML = createPoster(movie);
    body.innerHTML = modalBodyHTML(movie, null);

    showModal();

    try {
        const details = await fetchTMDB("movie", { id: movie.id });

        if (requestId !== modalRequestNumber) return;

        if (details.backdrop_path) {
            panel.style.setProperty(
                "--modal-backdrop",
                `url("${TMDB_IMAGE_BASE}original${details.backdrop_path}")`
            );
        }

        const trailerKey = getTrailerKey(details.videos?.results);

        if (trailerKey) {
            panel.classList.add("has-trailer");

            media.innerHTML = `
                <div class="modal-trailer-player">
                    <iframe
                        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerKey)}?rel=0&modestbranding=1&playsinline=1"
                        title="${escapeHTML(details.title || movie.title)} trailer"
                        allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>
                </div>
            `;
        }

        body.innerHTML = modalBodyHTML(movie, details);

        refreshIcons();
    } catch (error) {
        // Keep the basic popup if the full details cannot be loaded.
        console.warn("Unable to load full movie details:", error);
    }
}

function closeModal() {
    const modal = getModal();

    if (!modal || modal.hidden) return;

    modalRequestNumber++;

    const panel = modal.querySelector(".modal-panel");

    // Emptying the media area also stops any playing trailer.
    const media = modal.querySelector(".modal-media");

    if (media) media.innerHTML = "";

    panel?.classList.remove("has-trailer");
    panel?.style.removeProperty("--modal-backdrop");

    modal.hidden = true;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    if (lastFocused && typeof lastFocused.focus === "function") {
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

        const openId = movieButton.dataset.openMovie;

        openModal(

            getMovie(openId) ||

            (/^\d+$/.test(String(openId))
                ? { id: String(openId), title: "", year: "", rating: 0, genres: [], description: "" }
                : null)

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

showGenreBrowser();

loadGenres();

refreshIcons();