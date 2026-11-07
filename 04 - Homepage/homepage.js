
document.addEventListener("DOMContentLoaded", () => {

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    const getElement = (id) => document.getElementById(id);

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function renderLucideIcons() {
        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

    let movies = [
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
            description: "Two young people from different worlds meet aboard the legendary Titanic.",
            trending: true,
            topRated: false
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
            description: "A young boy is accidentally left home alone during the holidays.",
            trending: true,
            topRated: false
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
            description: "A skilled thief enters people's dreams to steal valuable secrets.",
            trending: true,
            topRated: true
        }
    ];

    function getMovie(id) {
        return movies.find(movie => String(movie.id) === String(id));
    }

    const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

    async function fetchTMDB(type, query = "", page = 1) {

        const parameters = new URLSearchParams({
            type: type,
            page: String(page)
        });

        if (query) {
            parameters.set("query", query);
        }

        const response = await fetch(
            `tmdb_movies.php?${parameters.toString()}`
        );

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(
                data.error || "Unable to fetch TMDB data."
            );
        }

        return data;
    }


    // TMDB genre ID conversion

    const genreNames = {
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


    // Convert TMDB movie information
    // into CineMax movie objects.

    function normalizeTMDBMovie(movie) {

        return {
            id: String(movie.id),

            title: movie.title || movie.original_title || "Untitled",

            year: movie.release_date
                ? Number(movie.release_date.slice(0, 4))
                : "N/A",

            rating: Number(movie.vote_average || 0),

            genres: (movie.genre_ids || [])
                .map(id => genreNames[id])
                .filter(Boolean),

            director: "",
            cast: [],

            poster: movie.poster_path
                ? `${TMDB_IMAGE_BASE}w500${movie.poster_path}`
                : "",

            backdrop: movie.backdrop_path
                ? `${TMDB_IMAGE_BASE}original${movie.backdrop_path}`
                : "",

            description: movie.overview || "No description available.",

            trending: false,
            topRated: false
        };
    }

    function createPoster(movie) {

        const posterContent = movie.poster
            ? `<img
                    src="${escapeHTML(movie.poster)}"
                    alt="${escapeHTML(movie.title)} poster"
                    loading="lazy"
                    onerror="this.style.display='none'"
               >`

            : `<div class="poster-placeholder">
                    ${escapeHTML(movie.title)}
               </div>`;

        return `
            <div class="movie-poster">
                ${posterContent}
            </div>
        `;
    }


    function createMovieCard(movie, extraContent = "") {

        return `
            <article class="movie-card">

                ${createPoster(movie)}

                <div class="movie-info">

                    <h3>${escapeHTML(movie.title)}</h3>

                    <p class="movie-meta">
                        ${escapeHTML(movie.year)}
                        ·
                        ${escapeHTML(movie.genres.join(", "))}
                    </p>

                    <p class="movie-rating">
                        ★ ${movie.rating.toFixed(1)}
                    </p>

                    ${extraContent}

                </div>

            </article>
        `;
    }

    let showcaseMovies = [
        getMovie("truman-show"),
        getMovie("dead-poets"),
        getMovie("dark-knight")
    ].filter(Boolean);

    let currentShowcaseSlide = 0;


    function renderCinemaShowcase() {

        const cinemaShowcase = getElement("cinemaShowcase");
        const dots = getElement("dots");

        if (!cinemaShowcase || !dots || showcaseMovies.length === 0) {
            return;
        }

        const movie = showcaseMovies[currentShowcaseSlide];

        if (!movie) return;

        if (movie.backdrop) {

            cinemaShowcase.style.backgroundImage = `
                linear-gradient(
                    to right,
                    rgba(5, 10, 20, 0.95),
                    rgba(5, 10, 20, 0.25)
                ),
                url("${movie.backdrop}")
            `;

        } else {

            cinemaShowcase.style.backgroundImage = "";
        }

        cinemaShowcase.innerHTML = `

            <div class="hero-content">

                <p class="hero-label">
                    FEATURED FILM
                </p>

                <h1>
                    ${escapeHTML(movie.title)}
                </h1>

                <p class="hero-description">
                    ${escapeHTML(movie.description)}
                </p>

                <p class="hero-meta">
                    ${escapeHTML(movie.year)}
                    ·
                    ★ ${movie.rating.toFixed(1)}
                </p>

                <button
                    class="hero-button"
                    data-movie-id="${escapeHTML(movie.id)}"
                >
                    Explore Movie
                </button>

            </div>

        `;

        dots.innerHTML = showcaseMovies.map((_, index) => `

            <button
                class="hero-dot ${index === currentShowcaseSlide ? "active" : ""}"
                data-slide="${index}"
                aria-label="Go to slide ${index + 1}"
                aria-pressed="${index === currentShowcaseSlide}"
            ></button>

        `).join("");

    }


    function nextShowcaseSlide() {

        if (showcaseMovies.length <= 1) return;

        currentShowcaseSlide =
            (currentShowcaseSlide + 1) % showcaseMovies.length;

        renderCinemaShowcase();
    }


    function previousShowcaseSlide() {

        if (showcaseMovies.length <= 1) return;

        currentShowcaseSlide =
            (currentShowcaseSlide - 1 + showcaseMovies.length)
            % showcaseMovies.length;

        renderCinemaShowcase();
    }


    renderCinemaShowcase();


    // Automatically changes the featured film every 6 seconds.

    setInterval(() => {

        if (showcaseMovies.length > 1) {
            nextShowcaseSlide();
        }

    }, 6000);

    const continueWatching = [
        {
            movieId: "dark-knight",
            progress: 65
        },
        {
            movieId: "truman-show",
            progress: 35
        },
        {
            movieId: "inception",
            progress: 80
        }
    ];


    function renderContinueWatching() {

        const container = getElement("continue-movies");

        if (!container) return;

        container.innerHTML = continueWatching.map(item => {

            const movie = getMovie(item.movieId);

            if (!movie) return "";

            return createMovieCard(movie, `

                <div class="progress-container">

                    <div class="progress-bar">

                        <div
                            class="progress-fill"
                            style="width: ${item.progress}%"
                        ></div>

                    </div>

                    <p>${item.progress}% watched</p>

                </div>

            `);

        }).join("");
    }


    renderContinueWatching();

    let tmdbTrendingMovies = [];


    function renderTrending() {

        const container = getElement("trending");

        if (!container) return;

        const trendingMovies = tmdbTrendingMovies.length
            ? tmdbTrendingMovies
            : movies.filter(movie => movie.trending);

        container.innerHTML = trendingMovies
            .map(movie => createMovieCard(movie))
            .join("");
    }


    renderTrending();

    const genres = [
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

        const container = getElement("genres-list");

        if (!container) return;

        container.innerHTML = genres.map(genre => `

            <button
                class="genre-card"
                data-genre="${escapeHTML(genre)}"
            >
                ${escapeHTML(genre)}
            </button>

        `).join("");
    }


    renderGenres();

    const people = [
        {
            name: "Christopher Nolan",
            roles: ["director"],
            knownFor: "Inception, The Dark Knight"
        },
        {
            name: "Leonardo DiCaprio",
            roles: ["actor"],
            knownFor: "Titanic, Inception"
        },
        {
            name: "Peter Weir",
            roles: ["director"],
            knownFor: "The Truman Show, Dead Poets Society"
        },
        {
            name: "Jim Carrey",
            roles: ["actor"],
            knownFor: "The Truman Show"
        },
        {
            name: "Christian Bale",
            roles: ["actor"],
            knownFor: "The Dark Knight"
        },
        {
            name: "James Cameron",
            roles: ["director"],
            knownFor: "Titanic"
        },
        {
            name: "Kate Winslet",
            roles: ["actor"],
            knownFor: "Titanic"
        },
        {
            name: "Bradley Cooper",
            roles: ["actor", "director"],
            knownFor: "A Star Is Born"
        }
    ];


    function renderPeople(role = "all") {

        const container = getElement("people-list");

        if (!container) return;

        const filteredPeople = people.filter(person => {

            return role === "all" || person.roles.includes(role);

        });

        container.innerHTML = filteredPeople.map(person => `

            <article class="person-card">

                <div class="person-avatar">
                    ${escapeHTML(person.name.charAt(0))}
                </div>

                <div class="person-info">

                    <h3>${escapeHTML(person.name)}</h3>

                    <p>
                        ${person.roles.map(role =>
                            role.charAt(0).toUpperCase() + role.slice(1)
                        ).join(" · ")}
                    </p>

                    <small>
                        Known for: ${escapeHTML(person.knownFor)}
                    </small>

                </div>

            </article>

        `).join("");
    }


    renderPeople();

    let tmdbTopRatedMovies = [];


    function renderTopRated() {

        const container = getElement("rank");

        if (!container) return;

        const topRatedMovies = tmdbTopRatedMovies.length
            ? tmdbTopRatedMovies
            : movies.filter(movie => movie.topRated);

        const sortedMovies = [...topRatedMovies]
            .sort((a, b) => b.rating - a.rating);

        container.innerHTML = sortedMovies.map((movie, index) => `

            <li class="rank-item">

                <span class="rank-number">
                    ${index + 1}
                </span>

                ${createPoster(movie)}

                <div class="rank-info">

                    <h3>${escapeHTML(movie.title)}</h3>

                    <p>${escapeHTML(movie.year)}</p>

                </div>

                <span class="rank-rating">
                    ★ ${movie.rating.toFixed(1)}
                </span>

            </li>

        `).join("");
    }


    renderTopRated();

    const STORAGE_KEY = "cinemax-watchlist";


    function getWatchlist() {

        try {

            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            );

            return Array.isArray(saved) ? saved : [];

        } catch {

            return [];
        }
    }


    function saveWatchlist(watchlist) {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(watchlist)
        );
    }


    function renderWatchlist() {

        const container = getElement("watchlist-movies");
        const emptyMessage = getElement("empty-watchlist");

        if (!container) return;

        const watchlist = getWatchlist();

        const savedMovies = watchlist
            .map(id => getMovie(id))
            .filter(Boolean);

        container.innerHTML = savedMovies.map(movie => `

            ${createMovieCard(movie, `

                <button
                    class="remove-watchlist"
                    data-remove-id="${escapeHTML(movie.id)}"
                >
                    Remove from Watchlist
                </button>

            `)}

        `).join("");

        if (emptyMessage) {
            emptyMessage.hidden = savedMovies.length > 0;
        }
    }


    renderWatchlist();

    const searchInput = getElement("homepage-search");
    const searchSection = getElement("search-results-section");
    const searchResults = getElement("search-results");

    let searchRequestNumber = 0;


    async function performSearch(query) {

        if (!searchSection || !searchResults) return;

        const searchTerm = query.trim();

        if (!searchTerm) {

            searchSection.hidden = true;
            searchRequestNumber++;

            return;
        }

        const requestNumber = ++searchRequestNumber;

        searchSection.hidden = false;

        searchResults.innerHTML = `
            <p class="no-results">Searching CineMax...</p>
        `;

        try {

            const [movieData, peopleData] = await Promise.all([

                fetchTMDB("search", searchTerm),

                fetchTMDB("people", searchTerm)

            ]);

            // Prevent older search results from replacing newer ones.

            if (requestNumber !== searchRequestNumber) return;

            const matchingMovies = (movieData.results || [])
                .map(normalizeTMDBMovie);

            const matchingPeople = (peopleData.results || []).map(person => ({

                name: person.name,

                roles: person.known_for_department === "Directing"
                    ? ["director"]
                    : ["actor"],

                knownFor: (person.known_for || [])
                    .map(item => item.title || item.name)
                    .filter(Boolean)
                    .join(", ")

            }));


            let resultsHTML = "";


            // MOVIE RESULTS

            if (matchingMovies.length > 0) {

                resultsHTML += `

                    <h3>Movies</h3>

                    <div class="movie-row">

                        ${matchingMovies
                            .map(movie => createMovieCard(movie))
                            .join("")}

                    </div>

                `;
            }


            // PEOPLE RESULTS

            if (matchingPeople.length > 0) {

                resultsHTML += `

                    <h3>People</h3>

                    <div class="people-grid">

                        ${matchingPeople.map(person => `

                            <article class="person-card">

                                <div class="person-avatar">
                                    ${escapeHTML(person.name.charAt(0))}
                                </div>

                                <div class="person-info">

                                    <h3>${escapeHTML(person.name)}</h3>

                                    <p>
                                        ${person.roles.map(role =>
                                            role.charAt(0).toUpperCase() +
                                            role.slice(1)
                                        ).join(" · ")}
                                    </p>

                                    <small>
                                        Known for: ${escapeHTML(person.knownFor)}
                                    </small>

                                </div>

                            </article>

                        `).join("")}

                    </div>

                `;
            }


            // NO RESULTS

            if (!resultsHTML) {

                resultsHTML = `

                    <p class="no-results">
                        No movies or people found for
                        "${escapeHTML(searchTerm)}".
                    </p>

                `;
            }


            searchResults.innerHTML = resultsHTML;

            renderLucideIcons();

        } catch (error) {

            if (requestNumber !== searchRequestNumber) return;

            console.error("TMDB Search Error:", error);

            searchResults.innerHTML = `

                <p class="no-results">
                    Unable to search right now. Please try again.
                </p>

            `;
        }
    }


    if (searchInput) {

        searchInput.addEventListener("input", () => {

            performSearch(searchInput.value);

        });
    }

    document.addEventListener("click", event => {


        // PEOPLE FILTERS

        const roleButton = event.target.closest("[data-role]");

        if (roleButton) {

            const role = roleButton.dataset.role;

            document.querySelectorAll("[data-role]").forEach(button => {

                button.setAttribute(
                    "aria-pressed",
                    button === roleButton ? "true" : "false"
                );

            });

            renderPeople(role);
        }


        // GENRE SELECTION

        const genreButton = event.target.closest("[data-genre]");

        if (genreButton) {

            const genre = genreButton.dataset.genre;

            if (searchInput) {

                searchInput.value = genre;

                performSearch(genre);

                searchSection?.scrollIntoView({
                    behavior: "smooth"
                });
            }
        }


        // ADD TO WATCHLIST

        const addButton = event.target.closest("[data-add-id]");

        if (addButton) {

            const movieId = addButton.dataset.addId;

            const watchlist = getWatchlist();

            if (!watchlist.includes(movieId)) {

                watchlist.push(movieId);

                saveWatchlist(watchlist);

                renderWatchlist();
            }
        }


        // REMOVE FROM WATCHLIST

        const removeButton = event.target.closest("[data-remove-id]");

        if (removeButton) {

            const movieId = removeButton.dataset.removeId;

            const updatedWatchlist = getWatchlist()
                .filter(id => id !== movieId);

            saveWatchlist(updatedWatchlist);

            renderWatchlist();
        }


        // HERO DOT NAVIGATION

        const dot = event.target.closest("[data-slide]");

        if (dot) {

            currentShowcaseSlide = Number(dot.dataset.slide);

            renderCinemaShowcase();
        }

    });

    async function loadTMDBMovies() {

        try {

            console.log("Connecting to TMDB...");

            const [trendingData, topRatedData] = await Promise.all([

                fetchTMDB("trending"),

                fetchTMDB("top-rated")

            ]);


            // Convert TMDB results.

            tmdbTrendingMovies = (trendingData.results || [])
                .map(movie => ({
                    ...normalizeTMDBMovie(movie),
                    trending: true
                }));

            tmdbTopRatedMovies = (topRatedData.results || [])
                .map(movie => ({
                    ...normalizeTMDBMovie(movie),
                    topRated: true
                }));


            // Combine sample and TMDB movies.
            // Remove duplicate movie IDs.

            const allMovies = [

                ...movies,

                ...tmdbTrendingMovies,

                ...tmdbTopRatedMovies

            ];

            movies = [

                ...new Map(

                    allMovies.map(movie => [
                        String(movie.id),
                        movie
                    ])

                ).values()

            ];


            // Update the hero carousel.

            showcaseMovies = tmdbTrendingMovies
                .filter(movie => movie.backdrop)
                .slice(0, 5);

            currentShowcaseSlide = 0;


            // Refresh homepage sections.

            renderCinemaShowcase();

            renderTrending();

            renderTopRated();

            renderContinueWatching();

            renderWatchlist();


            console.log("TMDB connected successfully!");

            console.log("Trending movies:", tmdbTrendingMovies);

            console.log("Top-rated movies:", tmdbTopRatedMovies);


        } catch (error) {

            console.error("TMDB Connection Error:", error);

            console.warn(
                "Using sample movie data as fallback."
            );

        }
    }

    loadTMDBMovies();

    renderLucideIcons();

});