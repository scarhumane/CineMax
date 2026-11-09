
document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    loadFeaturesTopRated();
});

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

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

/* NORMALIZE TMDB MOVIES */

function normalizeTMDBMovie(movie) {
    if (!movie || !movie.id) {
        return null;
    }

    const genres = movie.genre_ids
        ? movie.genre_ids.map(id => GENRE_NAMES[id]).filter(Boolean)
        : (movie.genres || [])
            .map(genre => genre.name)
            .filter(Boolean);

    return {
        id: String(movie.id),
        title: movie.title || movie.original_title || "Untitled",

        year: movie.release_date
            ? Number(movie.release_date.slice(0, 4))
            : "N/A",

        rating: Number(movie.vote_average || 0),

        genres,

        poster: movie.poster_path
            ? `${TMDB_IMAGE_BASE}w500${movie.poster_path}`
            : "",

        backdrop: movie.backdrop_path
            ? `${TMDB_IMAGE_BASE}original${movie.backdrop_path}`
            : "",

        description: movie.overview || "No description available."
    };
}

/* LOAD TOP RATED MOVIES */

async function loadFeaturesTopRated() {
    const rankList = document.getElementById("features-rank");

    if (!rankList) return;

    rankList.innerHTML = `
        <li class="rank-loading">
            Loading top-rated movies...
        </li>
    `;

    try {
        const response = await fetch(
            "../04 - Homepage/tmdb_movies.php?type=top-rated"
        );

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid response from the movie service.");
        }

        if (!response.ok || !data || data.error) {
            throw new Error(
                data?.error || "Unable to fetch top-rated movies."
            );
        }

        const movies = (data.results || [])
            .map(normalizeTMDBMovie)
            .filter(Boolean);

        if (!movies.length) {
            rankList.innerHTML = `
                <li class="rank-loading">
                    No top-rated movies available.
                </li>
            `;
            return;
        }

        // Same sorting logic used by the Homepage.
        const topMovies = [...movies]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5);

        rankList.innerHTML = topMovies.map((movie, index) => {
            const posterStyle = movie.poster
                ? `style="background-image: url('${escapeHTML(movie.poster)}')"`
                : "";

            const genreText = movie.genres
                .slice(0, 2)
                .join(", ");

            return `
                <li>
                    <span
                        class="rank-poster"
                        ${posterStyle}
                        aria-hidden="true">
                    </span>

                    <span class="n">${index + 1}</span>

                    <div class="t">
                        <b>${escapeHTML(movie.title)}</b>
                        <span>
                            ${escapeHTML(movie.year)}
                            ${genreText
                                ? ` · ${escapeHTML(genreText)}`
                                : ""}
                        </span>
                    </div>

                    <span class="score">
                        <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true">
                            <path d="m12 2 3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7L12 2Z"/>
                        </svg>

                        ${formatRating(movie.rating)}
                    </span>
                </li>
            `;
        }).join("");

    } catch (error) {
        console.error("Features Top Rated Error:", error);

        rankList.innerHTML = `
            <li class="rank-loading">
                Unable to load top-rated movies.
                Please try again later.
            </li>
        `;
    }
}
