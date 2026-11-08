
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

const GENRE_IDS = Object.fromEntries(
    Object.entries(GENRE_NAMES).map(([id, name]) => [
        name,
        Number(id)
    ])
);

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

    if (genre) {
        parameters.set("genre", String(genre));
    }

    if (id !== null) {
        parameters.set("person_id", String(id));
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

function normalizeTMDBPerson(person) {
    const department = (
        person.known_for_department || ""
    ).toLowerCase();

    const roles = department === "directing"
        ? ["director"]
        : department === "acting"
            ? ["actor"]
            : [];

    const knownFor = (person.known_for || [])
        .filter(item => item.media_type === "movie")
        .map(item => item.title)
        .filter(Boolean)
        .join(", ");

    return {
        id: String(person.id),
        name: person.name || "Unknown",
        roles,
        profile: person.profile_path
            ? `${TMDB_IMAGE_BASE}w185${person.profile_path}`
            : "",
        knownFor
    };
}

/* IMAGE FALLBACKS */

document.addEventListener("error", event => {
    const image = event.target;

    if (
        image.tagName !== "IMG" ||
        !image.closest(".movie-poster, .continue-thumb, .person-avatar, .person-detail-image, .person-film-card")
    ) {
        return;
    }

    const personAvatar = image.closest(".person-avatar");
    const detailImage = image.closest(".person-detail-image");

    const placeholder = document.createElement("div");

    placeholder.className = personAvatar || detailImage
        ? "person-placeholder"
        : "poster-placeholder";

    placeholder.textContent = personAvatar || detailImage
        ? image.alt.trim().charAt(0).toUpperCase()
        : image.alt.replace(/ poster$/, "");

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

/* PEOPLE CARDS */
function createPersonCard(person) {
    const roles = (person.roles || [])
        .map(role =>
            role.charAt(0).toUpperCase() + role.slice(1)
        )
        .join(" · ");

    const image = person.profile
        ? `
            <img
                src="${escapeHTML(person.profile)}"
                alt="${escapeHTML(person.name)}"
                loading="lazy"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >
            <div class="person-placeholder" style="display: none;">
                ${escapeHTML(person.name.charAt(0).toUpperCase())}
            </div>
        `
        : `
            <div class="person-placeholder">
                ${escapeHTML(person.name.charAt(0).toUpperCase())}
            </div>
        `;

    return `
        <article
            class="person-card"
            tabindex="0"
            role="button"
            data-open-person="${escapeHTML(String(person.id))}"
            aria-label="View details for ${escapeHTML(person.name)}"
        >
            <div class="person-avatar">
                ${image}
            </div>

            <div class="person-info">
                <h3>${escapeHTML(person.name)}</h3>

                <p>
                    ${escapeHTML(roles || "Film professional")}
                </p>

                <small>
                    Known for:
                    ${escapeHTML(
                        person.knownFor || "No movie credits available"
                    )}
                </small>
            </div>
        </article>
    `;
}

/* MODAL */

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

/* PERSON DETAILS */

function getPersonRoles(person, credits) {
    const roles = new Set();

    if (person.known_for_department?.toLowerCase() === "acting") {
        roles.add("actor");
    }

    if (person.known_for_department?.toLowerCase() === "directing") {
        roles.add("director");
    }

    const castCredits = credits?.cast || [];
    const crewCredits = credits?.crew || [];

    if (castCredits.length) {
        roles.add("actor");
    }

    if (crewCredits.some(item =>
        item.job?.toLowerCase() === "director"
    )) {
        roles.add("director");
    }

    return [...roles];
}

function normalizePersonCredit(credit) {
    if (!credit || !credit.id || !credit.title) {
        return null;
    }

    return normalizeTMDBMovie(credit);
}

function createPersonFilmCard(movie, role = "") {
    return `
        <button type="button"
                class="person-film-card"
                data-open-movie="${escapeHTML(movie.id)}">

            <div class="person-film-poster">
                ${movie.poster
                    ? `<img src="${escapeHTML(movie.poster)}"
                            alt="${escapeHTML(movie.title)} poster"
                            loading="lazy">`
                    : `<div class="poster-placeholder">
                            ${escapeHTML(movie.title)}
                       </div>`
                }
            </div>

            <span class="person-film-title">
                ${escapeHTML(movie.title)}
            </span>

            <small>
                ${escapeHTML(movie.year)}
                ${role ? ` · ${escapeHTML(role)}` : ""}
            </small>
        </button>
    `;
}

async function openPersonDetails(personId) {
    const modal = getModal();

    if (!modal) return;

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");

    if (!media || !body) return;

    const current = ++modalRequestNumber;

    lastFocused = document.activeElement;

    media.innerHTML = `
        <div class="person-detail-image">
            <div class="person-placeholder">...</div>
        </div>
    `;

    body.innerHTML = `
        <p class="hero-label">CineMax People</p>
        <h2 id="modal-title">Loading profile...</h2>
        <p class="no-results">Fetching information from TMDB...</p>
    `;

    showModal();

    try {
        const data = await fetchTMDB("person", {
            id: personId
        });

        if (current !== modalRequestNumber) return;

        const person = data.person;
        const credits = data.credits || {};

        if (!person || !person.id) {
            throw new Error("Person details were not found.");
        }

        const roles = getPersonRoles(person, credits);

        const roleText = roles.length
            ? roles.map(role =>
                role.charAt(0).toUpperCase() + role.slice(1)
            ).join(" · ")
            : "Film professional";

        const profile = person.profile_path
            ? `${TMDB_IMAGE_BASE}w500${person.profile_path}`
            : "";

        media.innerHTML = `
            <div class="person-detail-image">
                ${profile
                    ? `<img src="${escapeHTML(profile)}"
                            alt="${escapeHTML(person.name)}">`
                    : `<div class="person-placeholder">
                            ${escapeHTML((person.name || "?").charAt(0))}
                       </div>`
                }
            </div>
        `;

        const currentYear = new Date().getFullYear();

        function isValidCredit(credit) {
            if (!credit || !credit.id || !credit.title) {
                return false;
            }

            const character = (
                credit.character || ""
            ).toLowerCase();

            const releaseYear = credit.release_date
                ? Number(credit.release_date.slice(0, 4))
                : null;

            if (releaseYear && releaseYear > currentYear) {
                return false;
            }

            if (
                character.includes("self") ||
                character.includes("uncredited")
            ) {
                return false;
            }

            return true;
        }

        const castMovies = (credits.cast || [])
            .filter(isValidCredit)
            .map(credit => ({
                movie: normalizePersonCredit(credit),
                role: credit.character || "Actor",
                popularity: Number(credit.popularity || 0)
            }))
            .filter(item => item.movie);

        const directorMovies = (credits.crew || [])
            .filter(credit =>
                isValidCredit(credit) &&
                credit.job?.toLowerCase() === "director"
            )
            .map(credit => ({
                movie: normalizePersonCredit(credit),
                role: "Director",
                popularity: Number(credit.popularity || 0)
            }))
            .filter(item => item.movie);

        const allCredits = new Map();

        [...castMovies, ...directorMovies].forEach(item => {
            const id = String(item.movie.id);

            if (!allCredits.has(id)) {
                allCredits.set(id, item);
            } else {
                const existing = allCredits.get(id);

                if (
                    item.role === "Director" &&
                    existing.role !== "Director"
                ) {
                    existing.role = "Actor · Director";
                }

                existing.popularity = Math.max(
                    existing.popularity,
                    item.popularity
                );
            }
        });

        const filmography = [...allCredits.values()]
            .sort((a, b) => {
                const yearA = a.movie.year === "N/A"
                    ? 0 : a.movie.year;

                const yearB = b.movie.year === "N/A"
                    ? 0 : b.movie.year;

                return yearB - yearA;
            });

        register(filmography.map(item => item.movie));

        const knownFor = [...filmography]
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 5);

        const birthday = person.birthday
            ? new Date(`${person.birthday}T00:00:00`)
                .toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC"
                })
            : "Not available";

        const birthplace = person.place_of_birth ||
            "Not available";

        const biography = (
            person.biography ||
            "No biography is available for this person."
        ).trim();

        const biographyLimit = 450;

        const shortBiography = biography.length > biographyLimit
            ? biography.slice(0, biographyLimit).trim() + "..."
            : biography;

        body.innerHTML = `
            <p class="hero-label">CineMax People</p>

            <h2 id="modal-title">
                ${escapeHTML(person.name || "Unknown")}
            </h2>

            <p class="person-detail-role">
                ${escapeHTML(roleText)}
            </p>

            <div class="person-detail-facts">
                <p>
                    <span>Birthday</span>
                    ${escapeHTML(birthday)}
                </p>

                <p>
                    <span>Place of birth</span>
                    ${escapeHTML(birthplace)}
                </p>
            </div>

            <section class="person-detail-section">
                <h3>Biography</h3>

                <p class="person-biography">
                    ${escapeHTML(shortBiography)}
                </p>

                ${biography.length > biographyLimit ? `
                    <details class="person-biography-more">
                        <summary>Read full biography</summary>

                        <p class="person-biography">
                            ${escapeHTML(biography)}
                        </p>
                    </details>
                ` : ""}
            </section>

            <section class="person-detail-section">
                <h3>Known For</h3>

                <div class="person-film-grid">
                    ${knownFor.length
                        ? knownFor.map(item =>
                            createPersonFilmCard(
                                item.movie,
                                item.role
                            )
                        ).join("")
                        : `<p class="no-results">
                                No movie credits available.
                           </p>`
                    }
                </div>
            </section>

            <section class="person-detail-section">
                <h3>Filmography</h3>

                <div class="person-film-grid">
                    ${filmography.length
                        ? filmography.map(item =>
                            createPersonFilmCard(
                                item.movie,
                                item.role
                            )
                        ).join("")
                        : `<p class="no-results">
                                No movie credits available.
                           </p>`
                    }
                </div>
            </section>
        `;

        refreshIcons();

    } catch (error) {
        if (current !== modalRequestNumber) return;

        console.error("Person details error:", error);

        media.innerHTML = "";

        body.innerHTML = `
            <p class="hero-label">CineMax People</p>
            <h2 id="modal-title">Unable to load profile</h2>

            <p class="no-results">
                ${escapeHTML(error.message || "Please try again later.")}
            </p>
        `;
    }
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

/* GENRES */

const GENRES = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller"
];

function renderGenres() {
    const container = $("genres-list");

    if (!container) return;

    container.innerHTML = GENRES.map(genre => `
        <button type="button"
                class="genre-card"
                data-genre="${escapeHTML(genre)}">
            ${escapeHTML(genre)}
        </button>
    `).join("");
}

/* PEOPLE */

let people = [];
let activePeopleRole = "all";

function renderPeople(role = activePeopleRole) {
    const container = $("people-list");

    if (!container) return;

    activePeopleRole = role;

    const filtered = people.filter(person =>
        role === "all" || person.roles.includes(role)
    );

    container.innerHTML = filtered.length
        ? filtered.map(createPersonCard).join("")
        : loadingHTML("No matching people found.");
}

let peopleSearchTimer = null;
let peopleRequestNumber = 0;

async function loadPopularPeople() {
    const current = ++peopleRequestNumber;
    const container = $("people-list");

    if (container) {
        container.innerHTML = loadingHTML("Loading people...");
    }

    try {
        const data = await fetchTMDB("people");

        if (current !== peopleRequestNumber) return;

        people = (data.results || [])
            .map(normalizeTMDBPerson)
            .filter(person => person.id && person.roles.length);

        renderPeople();

    } catch (error) {
        if (current !== peopleRequestNumber) return;

        console.error("Popular people error:", error);

        if (container) {
            container.innerHTML = loadingHTML(
                "Unable to load people. Please try again later."
            );
        }
    }
}

async function searchPeopleSection(query) {
    const term = query.trim();
    const current = ++peopleRequestNumber;
    const container = $("people-list");

    if (!term) {
        await loadPopularPeople();
        return;
    }

    if (container) {
        container.innerHTML = loadingHTML("Searching people...");
    }

    try {
        const data = await fetchTMDB("people", {
            query: term
        });

        if (current !== peopleRequestNumber) return;

        people = (data.results || [])
            .map(normalizeTMDBPerson)
            .filter(person => person.id && person.roles.length);

        renderPeople();

    } catch (error) {
        if (current !== peopleRequestNumber) return;

        console.error("People search error:", error);

        if (container) {
            container.innerHTML = loadingHTML(
                "Unable to search people right now. Please try again."
            );
        }
    }
}

const peopleSearch = $("people-search");

if (peopleSearch) {
    peopleSearch.addEventListener("input", () => {
        clearTimeout(peopleSearchTimer);

        peopleSearchTimer = setTimeout(() => {
            searchPeopleSection(peopleSearch.value);
        }, 350);
    });
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

/* SEARCH */

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

    showResults("Search Results", loadingHTML("Searching CineMax..."));

    try {
        const [movieData, peopleData] = await Promise.all([
            fetchTMDB("search", { query: term }),
            fetchTMDB("people", { query: term })
        ]);

        if (current !== requestNumber) return;

        const foundMovies = register(
            (movieData.results || [])
                .map(normalizeTMDBMovie)
                .filter(Boolean)
        );

        const foundPeople = (peopleData.results || [])
            .map(normalizeTMDBPerson)
            .filter(person => person.id && person.roles.length);

        let html = "";

        if (foundMovies.length) {
            html += `<h3>Movies</h3>${moviesRow(foundMovies)}`;
        }

        if (foundPeople.length) {
            html += `
                <h3>People</h3>
                <div class="people-grid">
                    ${foundPeople.map(createPersonCard).join("")}
                </div>
            `;
        }

        if (!html) {
            html = loadingHTML(`No movies or people found for "${term}".`);
        }

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

/* GENRE SEARCH */

async function showGenre(genre) {
    const current = ++requestNumber;

    showResults(
        `${genre} Movies`,
        loadingHTML(`Loading ${genre} movies...`)
    );

    if (resultsSection) {
        resultsSection.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth"
        });
    }

    try {
        const data = await fetchTMDB("discover", {
            genre: GENRE_IDS[genre]
        });

        if (current !== requestNumber) return;

        const found = register(
            (data.results || [])
                .map(normalizeTMDBMovie)
                .filter(Boolean)
        );

        showResults(
            `${genre} Movies`,
            found.length
                ? moviesRow(found)
                : loadingHTML(`No ${genre} movies found.`)
        );

    } catch (error) {
        if (current !== requestNumber) return;

        console.warn("Genre discover unavailable:", error);

        if (searchInput) {
            searchInput.value = genre;
        }

        performSearch(genre);
    }
}

/* CLICK EVENTS */

document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const target = event.target;

    const personCard = target.closest("[data-open-person]");

    if (personCard) {
        event.preventDefault();
        openPersonDetails(personCard.dataset.openPerson);
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

    const roleButton = target.closest("[data-role]");

    if (roleButton) {
        document.querySelectorAll("[data-role]").forEach(button => {
            const active = button === roleButton;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        renderPeople(roleButton.dataset.role);
        return;
    }

    const genreButton = target.closest("[data-genre]");

    if (genreButton) {
        showGenre(genreButton.dataset.genre);
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
    if (
        (event.key === "Enter" || event.key === " ") &&
        event.target instanceof Element
    ) {
        const personCard = event.target.closest("[data-open-person]");

        if (personCard && event.target === personCard) {
            event.preventDefault();
            openPersonDetails(personCard.dataset.openPerson);
            return;
        }
    }

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
renderGenres();
renderPeople();
renderWatchlist();
watchSections();
refreshIcons();

loadTMDB();
loadPopularPeople();