const $ = id => document.getElementById(id);

const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

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

/* GENRE LOOKUP
   Kept for displaying movie genre labels.
   The homepage no longer displays a Genres section.
*/

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
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western"
};

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

/* SAMPLE MOVIES */

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
    page = 1
} = {}) {
    const parameters = new URLSearchParams({
        type,
        page: String(page)
    });

    if (query) {
        parameters.set("query", query);
    }

    const response = await fetch(
        `tmdb_movies.php?${parameters.toString()}`
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("The movie service returned an invalid response.");
    }

    if (!response.ok || !data || data.error) {
        throw new Error(
            data?.error || "Unable to fetch movie data."
        );
    }

    return data;
}

function normalizeTMDBMovie(movie) {
    if (!movie || !movie.id) {
        return null;
    }

    const genres = movie.genre_ids
        ? movie.genre_ids.map(id => GENRE_NAMES[id]).filter(Boolean)
        : (movie.genres || []).map(genre => genre.name).filter(Boolean);

    return {
        id: String(movie.id),
        title: movie.title || movie.original_title || "Untitled",
        year: movie.release_date
            ? Number(movie.release_date.slice(0, 4))
            : "N/A",
        rating: Number(movie.vote_average || 0),
        genres,
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
        description: movie.overview || "No description available.",
        trending: false,
        topRated: false
    };
}

/* IMAGE FALLBACKS */

document.addEventListener("error", event => {
    const image = event.target;

    if (
        image.tagName !== "IMG" ||
        !image.closest(".movie-poster, .continue-thumb")
    ) {
        return;
    }

    const placeholder = document.createElement("div");

    placeholder.className = "poster-placeholder";
    placeholder.textContent = image.alt.replace(/ poster$/, "");

    image.replaceWith(placeholder);
}, true);

/* WATCHLIST */

const WATCHLIST_KEY = "cinemax-watchlist-v2";
const OLD_WATCHLIST_KEY = "cinemax-watchlist";

let watchlistCache = null;

function readWatchlist(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : null;
    } catch (error) {
        console.warn("Unable to read the watchlist:", error);
        return null;
    }
}

function writeWatchlist(list) {
    try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    } catch (error) {
        console.warn("Unable to save the watchlist:", error);
    }
}

function getWatchlist() {
    if (watchlistCache !== null) {
        return watchlistCache;
    }

    const saved = readWatchlist(WATCHLIST_KEY);

    if (saved !== null) {
        watchlistCache = saved.filter(movie => movie && movie.id);
    } else {
        const oldIds = readWatchlist(OLD_WATCHLIST_KEY) || [];

        watchlistCache = oldIds
            .map(id => getMovie(id))
            .filter(Boolean);

        if (watchlistCache.length) {
            writeWatchlist(watchlistCache);
        }
    }

    return watchlistCache;
}

function isSaved(id) {
    return getWatchlist().some(
        movie => String(movie.id) === String(id)
    );
}

function notifyWatchlistChange() {
    document.dispatchEvent(new CustomEvent("watchlist:change"));
}

function addToWatchlist(movie) {
    if (!movie || isSaved(movie.id)) return;

    watchlistCache = [...getWatchlist(), movie];
    writeWatchlist(watchlistCache);
    notifyWatchlistChange();
}

function removeFromWatchlist(id) {
    watchlistCache = getWatchlist().filter(
        movie => String(movie.id) !== String(id)
    );

    writeWatchlist(watchlistCache);
    notifyWatchlistChange();
}

function toggleWatchlist(movie) {
    if (!movie) return false;

    if (isSaved(movie.id)) {
        removeFromWatchlist(movie.id);
        return false;
    }

    addToWatchlist(movie);
    return true;
}

/* MOVIE CARDS */

function createPoster(movie) {
    const content = movie.poster
        ? `<img src="${escapeHTML(movie.poster)}"
                alt="${escapeHTML(movie.title)} poster"
                loading="lazy">`
        : `<div class="poster-placeholder">${escapeHTML(movie.title)}</div>`;

    return `<div class="movie-poster">${content}</div>`;
}

function createMovieCard(movie, extraContent = "") {
    return `
        <article class="movie-card">
            <a href="#" class="movie-open"
               data-open-movie="${escapeHTML(movie.id)}">

                ${createPoster(movie)}

                <div class="movie-info">
                    <h3>${escapeHTML(movie.title)}</h3>

                    <p class="movie-meta">
                        ${escapeHTML(movie.year)} ·
                        ${escapeHTML((movie.genres || []).slice(0, 2).join(", "))}
                    </p>

                    <p class="movie-rating">
                        ★ ${formatRating(movie.rating)}
                    </p>
                </div>
            </a>

            ${extraContent}
        </article>
    `;
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
            ${createMovieCard(movie)}
        </li>
    `;
}

/* MOVIE MODAL */

let lastFocused = null;
let modalRequestNumber = 0;

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

function updateWatchButton(button, movie) {
    const saved = isSaved(movie.id);

    button.textContent = saved
        ? "Remove from Watchlist"
        : "Add to Watchlist";

    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
}

function openModal(movie) {
    const modal = getModal();

    if (!modal || !movie) return;

    modalRequestNumber++;
    lastFocused = document.activeElement;

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");
    const closeButton = modal.querySelector(".modal-close");

    if (!media || !body || !closeButton) return;

    media.innerHTML = createPoster(movie);

    const credits = [
        movie.director
            ? `<p><span>Director</span>${escapeHTML(movie.director)}</p>`
            : "",
        movie.cast && movie.cast.length
            ? `<p><span>Cast</span>${escapeHTML(movie.cast.join(", "))}</p>`
            : ""
    ].join("");

    body.innerHTML = `
        <p class="hero-label">Movie details</p>

        <h2 id="modal-title">${escapeHTML(movie.title)}</h2>

        <p class="modal-meta">
            ${escapeHTML(movie.year)}
            ·
            <span class="modal-rating">★ ${formatRating(movie.rating)}</span>
        </p>

        <div class="modal-tags">
            ${(movie.genres || []).map(genre => `
                <span class="tag">${escapeHTML(genre)}</span>
            `).join("")}
        </div>

        <p class="modal-description">
            ${escapeHTML(movie.description)}
        </p>

        <div class="modal-credits">${credits}</div>

        <button type="button" class="modal-watch"></button>
    `;

    const button = body.querySelector(".modal-watch");

    updateWatchButton(button, movie);

    button.addEventListener("click", () => {
        toggleWatchlist(movie);
        updateWatchButton(button, movie);
    });

    showModal();
}

function closeModal() {
    const modal = getModal();

    if (!modal || modal.hidden) return;

    modalRequestNumber++;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
    }
}

/* PAGE CONTENT */

let tmdbTrending = [];
let tmdbTopRated = [];

let heroMovies = [
    "truman-show",
    "dead-poets",
    "dark-knight",
    "inception",
    "titanic"
].map(getMovie).filter(Boolean);

let heroIndex = 0;
let heroTimer = null;

function buildHero() {
    const hero = $("cinemaShowcase");
    const dots = $("dots");

    if (!hero || !dots || !heroMovies.length) return;

    heroIndex = 0;

    hero.innerHTML = heroMovies.map((movie, index) => `
        <div class="hero-slide ${index === 0 ? "active" : ""}"
             ${movie.backdrop
                ? `style="--hero-backdrop:url('${escapeHTML(movie.backdrop)}')"`
                : ""}
             aria-hidden="${index === 0 ? "false" : "true"}">

            <div class="hero-content">
                <p class="hero-label">Featured film</p>
                <h1>${escapeHTML(movie.title)}</h1>

                <p class="hero-description">
                    ${escapeHTML(movie.description)}
                </p>

                <p class="hero-meta">
                    ${escapeHTML(movie.year)}
                    · ★ ${formatRating(movie.rating)}
                    ${movie.genres.length
                        ? " · " + escapeHTML(movie.genres.slice(0, 3).join(", "))
                        : ""}
                </p>

                <button type="button"
                        class="hero-button"
                        data-open-movie="${escapeHTML(movie.id)}">
                    Explore Movie
                </button>
            </div>
        </div>
    `).join("") + `
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

    refreshIcons();
    startHeroTimer();
}

function showHeroSlide(index) {
    const count = heroMovies.length;

    if (!count) return;

    heroIndex = (index + count) % count;

    $("cinemaShowcase").querySelectorAll(".hero-slide").forEach((slide, i) => {
        slide.classList.toggle("active", i === heroIndex);
        slide.setAttribute("aria-hidden", String(i !== heroIndex));
    });

    $("dots").querySelectorAll(".hero-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === heroIndex);
        dot.setAttribute("aria-current", String(i === heroIndex));
    });
}

function startHeroTimer() {
    clearInterval(heroTimer);

    if (reducedMotion || heroMovies.length < 2) return;

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

const loadingHTML = text => `
    <p class="no-results">${escapeHTML(text)}</p>
`;

async function renderContinueWatching() {
    const container = $("continue-movies");

    if (!container) return;

    container.innerHTML = loadingHTML("Loading your movies...");

    const results = await Promise.allSettled(
        continueWatching.map(async item => {
            const data = await fetchTMDB("search", {
                query: item.title
            });

            const match = (data.results || []).find(movie =>
                movie.title?.toLowerCase() === item.title.toLowerCase() &&
                movie.release_date?.startsWith(String(item.year))
            );

            if (!match) return null;

            const movie = normalizeTMDBMovie(match);

            if (!movie) return null;

            register([movie]);

            return { movie, progress: item.progress };
        })
    );

    const available = results
        .filter(result => result.status === "fulfilled" && result.value)
        .map(result => result.value);

    results
        .filter(result => result.status === "rejected")
        .forEach(result =>
            console.error("Continue Watching error:", result.reason)
        );

    container.innerHTML = available.length
        ? available.map(item =>
            createContinueCard(item.movie, item.progress)
        ).join("")
        : results.some(result => result.status === "rejected")
            ? loadingHTML("Unable to load your movies right now.")
            : loadingHTML("No movies available.");
}

/* TRENDING AND TOP RATED */

function renderTrending() {
    const container = $("trending");

    if (!container) return;

    const pool = tmdbTrending.length
        ? tmdbTrending
        : SAMPLE_MOVIES.filter(movie => movie.trending);

    container.innerHTML = [...pool]
        .slice(0, 12)
        .map(movie => createMovieCard(movie))
        .join("");
}

function renderTopRated() {
    const container = $("rank");

    if (!container) return;

    const pool = tmdbTopRated.length
        ? tmdbTopRated
        : SAMPLE_MOVIES.filter(movie => movie.topRated);

    container.innerHTML = [...pool]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10)
        .map((movie, index) => createTopCard(movie, index + 1))
        .join("");
}

/* WATCHLIST DISPLAY */

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

document.addEventListener("watchlist:change", renderWatchlist);

/* MOVIE SEARCH */

const searchInput = $("homepage-search");
const resultsSection = $("search-results-section");
const resultsBox = $("search-results");
const resultsTitle = $("search-title");

let requestNumber = 0;
let searchTimer = null;

function showResults(title, html) {
    if (!resultsSection || !resultsBox) return;

    if (resultsTitle) {
        resultsTitle.textContent = title;
    }

    resultsBox.innerHTML = html;
    resultsSection.hidden = false;
}

function clearResults() {
    requestNumber++;

    if (resultsSection) {
        resultsSection.hidden = true;
    }

    if (searchInput) {
        searchInput.value = "";
    }
}

const moviesRow = movies => `
    <div class="movie-row">
        ${movies.map(movie => createMovieCard(movie)).join("")}
    </div>
`;

async function performSearch(query) {
    const term = query.trim();

    if (!term) {
        clearResults();
        return;
    }

    const current = ++requestNumber;

    showResults(
        "Search Results",
        loadingHTML("Searching CineMax...")
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

        const html = foundMovies.length
            ? `<h3>Movies</h3>${moviesRow(foundMovies)}`
            : loadingHTML(`No movies found for "${term}".`);

        showResults("Search Results", html);

    } catch (error) {
        if (current !== requestNumber) return;

        console.error("TMDB search error:", error);

        showResults(
            "Search Results",
            loadingHTML("Unable to search right now. Please try again.")
        );
    }
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
            performSearch(searchInput.value);
        }, 300);
    });
}

/* CLICK EVENTS */

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const target = event.target;

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
                left:
                    Number(rowButton.dataset.dir) *
                    row.clientWidth *
                    0.85,
                behavior: reducedMotion ? "auto" : "smooth"
            });
        }

        return;
    }

    const heroNav = target.closest("[data-hero-nav]");

    if (heroNav) {
        showHeroSlide(
            heroIndex + Number(heroNav.dataset.heroNav)
        );

        startHeroTimer();
        return;
    }

    const dot = target.closest("[data-slide]");

    if (dot) {
        showHeroSlide(Number(dot.dataset.slide));
        startHeroTimer();
        return;
    }

    const removeButton = target.closest("[data-remove-watchlist]");

    if (removeButton) {
        removeFromWatchlist(removeButton.dataset.removeWatchlist);
        return;
    }

    if (target.closest("[data-clear-search]")) {
        clearResults();
    }
});

/* KEYBOARD EVENTS */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal();
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

/* NAVIGATION HIGHLIGHT */

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

/* LOAD TMDB DATA */

async function loadTMDB() {
    const [trendingResult, topRatedResult] = await Promise.allSettled([
        fetchTMDB("trending"),
        fetchTMDB("top-rated")
    ]);

    if (trendingResult.status === "fulfilled") {
        tmdbTrending = register(
            (trendingResult.value.results || [])
                .map(normalizeTMDBMovie)
                .filter(Boolean)
                .map(movie => ({ ...movie, trending: true }))
        );

        const withBackdrop = tmdbTrending
            .filter(movie => movie.backdrop)
            .slice(0, 5);

        if (withBackdrop.length) {
            heroMovies = withBackdrop;
            buildHero();
        }
    } else {
        console.error(
            "Trending movies could not be loaded:",
            trendingResult.reason
        );
    }

    if (topRatedResult.status === "fulfilled") {
        tmdbTopRated = register(
            (topRatedResult.value.results || [])
                .map(normalizeTMDBMovie)
                .filter(Boolean)
                .map(movie => ({ ...movie, topRated: true }))
        );
    } else {
        console.error(
            "Top rated movies could not be loaded:",
            topRatedResult.reason
        );
    }

    const failures = [trendingResult, topRatedResult]
        .filter(result => result.status === "rejected")
        .map(result => result.reason);

    const status = $("movie-service-status");

    if (status && failures.length) {
        const missingKey = failures.some(error =>
            String(error?.message || error).includes(
                "TMDB_API_KEY is not configured."
            )
        );

        status.textContent = missingKey
            ? "Live movie data is unavailable. Configure TMDB_API_KEY in tmdb_config.php to enable it."
            : "Some live movie data could not be loaded. Showing available previews.";

        status.hidden = false;
    }

    renderTrending();
    renderTopRated();
}

/* INITIALIZE PAGE */

buildHero();
renderContinueWatching();
renderTrending();
renderTopRated();
renderWatchlist();
watchSections();
refreshIcons();

loadTMDB();