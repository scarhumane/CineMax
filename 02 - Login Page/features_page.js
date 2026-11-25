
document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    loadFeaturesTopRated();
});

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

/* NORMALIZE LOCAL MOVIES */

function normalizeLocalMovie(movie) {
    if (!movie || !movie.id) {
        return null;
    }

    return {
        id: String(movie.id),
        title: movie.title || "Untitled",
        year: movie.year || "N/A",
        rating: Number(movie.rating || 0),
        genres: Array.isArray(movie.genres) ? movie.genres : [],
        poster: movie.poster || "",
        backdrop: movie.backdrop || "",
        description: movie.description || "No description available."
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
        const response = await fetch("../06 - Admin/admin_movies_api.php", {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid response from the local movie catalog.");
        }

        if (!response.ok || !data || data.error || !Array.isArray(data.movies)) {
            throw new Error(
                data?.error || "Unable to load movies from the local catalog."
            );
        }

        const movies = (data.movies || [])
            .map(normalizeLocalMovie)
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
