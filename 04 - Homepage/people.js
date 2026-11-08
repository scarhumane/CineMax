
const $ = id => document.getElementById(id);

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

const PROFILE_SIZE = "w342";
const POSTER_SIZE = "w342";

let people = [];
let activeRole = "all";

let searchRequestNumber = 0;
let peopleRequestNumber = 0;
let activePersonRequestNumber = 0;

function refreshIcons() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

function getImageURL(path, size = "w500") {
    if (!path) {
        return "";
    }

    return `${TMDB_IMAGE_BASE}${size}${path}`;
}

function getInitials(name) {
    return String(name || "Unknown")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join("")
        .toUpperCase();
}

function formatDate(date) {
    if (!date) {
        return "Unknown";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Unknown";
    }

    return parsedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function calculateAge(birthday, deathday = null) {
    if (!birthday) {
        return "";
    }

    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();

    if (Number.isNaN(birth.getTime()) || Number.isNaN(end.getTime())) {
        return "";
    }

    let age = end.getFullYear() - birth.getFullYear();

    const birthdayNotReached =
        end.getMonth() < birth.getMonth() ||
        (
            end.getMonth() === birth.getMonth() &&
            end.getDate() < birth.getDate()
        );

    if (birthdayNotReached) {
        age--;
    }

    return age >= 0 ? String(age) : "";
}

async function fetchTMDB(type, parameters = {}) {
    const url = new URL(
        "tmdb_movies.php",
        window.location.href
    );

    url.searchParams.set("type", type);

    Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }
    });

    const response = await fetch(url, {
        headers: {
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`TMDB request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

function normalizeTMDBPerson(person) {
    const knownFor = Array.isArray(person.known_for)
        ? person.known_for
        : [];

    const knownForMovies = knownFor.filter(item => {
        return item.media_type === "movie" ||
            (
                !item.media_type &&
                (item.title || item.release_date)
            );
    });

    return {
        id: person.id,
        name: person.name || "Unknown Person",

        department:
            person.known_for_department ||
            person.department ||
            "Unknown",

        profilePath: person.profile_path || null,

        popularity: Number(person.popularity || 0),

        knownFor: knownForMovies.map(movie => ({
            id: movie.id,
            title: movie.title || "Untitled Movie",
            posterPath: movie.poster_path || null,
            releaseDate: movie.release_date || "",
            character: movie.character || ""
        }))
    };
}

function createPersonCard(person) {
    const image = person.profilePath
        ? getImageURL(person.profilePath, PROFILE_SIZE)
        : "";

    const knownForText = person.knownFor.length
        ? person.knownFor
            .slice(0, 2)
            .map(movie => escapeHTML(movie.title))
            .join(", ")
        : "No movie credits available";

    return `
        <article
            class="person-card"
            data-person-id="${person.id}"
            tabindex="0"
            role="button"
            aria-label="View ${escapeHTML(person.name)}"
        >
            <div class="person-image">
                ${
                    image
                        ? `
                            <img
                                src="${image}"
                                alt="${escapeHTML(person.name)}"
                                loading="lazy"
                                onerror="
                                    this.style.display='none';
                                    this.nextElementSibling.style.display='flex';
                                "
                            >
                        `
                        : ""
                }

                <div
                    class="person-image-fallback"
                    style="${image ? "display:none;" : "display:flex;"}"
                >
                    ${escapeHTML(getInitials(person.name))}
                </div>
            </div>

            <div class="person-info">
                <h3 class="person-name">
                    ${escapeHTML(person.name)}
                </h3>

                <p class="person-role">
                    ${escapeHTML(person.department)}
                </p>

                <p class="person-known-for">
                    ${knownForText}
                </p>
            </div>
        </article>
    `;
}

function renderPeople(list = people) {
    const container = $("people-list");

    if (!container) {
        return;
    }

    let filteredPeople = [...list];

    if (activeRole !== "all") {
        filteredPeople = filteredPeople.filter(person => {
            return person.department.toLowerCase() === activeRole;
        });
    }

    if (!filteredPeople.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No people found</h3>
                <p>Try another name or change the selected filter.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = filteredPeople
        .map(createPersonCard)
        .join("");

    refreshIcons();
}

async function loadPopularPeople() {
    const container = $("people-list");

    if (!container) {
        return;
    }

    const requestNumber = ++peopleRequestNumber;

    container.innerHTML = `
        <div class="loading-state">
            <p>Loading people...</p>
        </div>
    `;

    try {
        const data = await fetchTMDB("people", {
            page: 1
        });

        if (requestNumber !== peopleRequestNumber) {
            return;
        }

        const results = Array.isArray(data)
            ? data
            : data.results || [];

        people = results
            .map(normalizeTMDBPerson)
            .filter(person => person.id && person.name);

        renderPeople();

    } catch (error) {
        console.error("Unable to load people:", error);

        if (requestNumber !== peopleRequestNumber) {
            return;
        }

        container.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load people</h3>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

async function searchPeople(query) {
    const container = $("people-list");

    if (!container) {
        return;
    }

    const requestNumber = ++searchRequestNumber;

    peopleRequestNumber++;

    if (!query.trim()) {
        await loadPopularPeople();
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            <p>Searching people...</p>
        </div>
    `;

    try {
        const data = await fetchTMDB("people", {
            query: query.trim(),
            page: 1
        });

        if (requestNumber !== searchRequestNumber) {
            return;
        }

        const results = Array.isArray(data)
            ? data
            : data.results || [];

        people = results
            .map(normalizeTMDBPerson)
            .filter(person => person.id && person.name);

        renderPeople();

    } catch (error) {
        console.error("People search failed:", error);

        if (requestNumber !== searchRequestNumber) {
            return;
        }

        container.innerHTML = `
            <div class="empty-state">
                <h3>Search unavailable</h3>
                <p>Something went wrong. Please try again.</p>
            </div>
        `;
    }
}

function setupRoleFilters() {
    const filters = document.querySelectorAll("[data-role]");

    filters.forEach(button => {
        button.addEventListener("click", () => {
            activeRole = button.dataset.role || "all";

            filters.forEach(filter => {
                const isActive = filter === button;

                filter.classList.toggle("active", isActive);
                filter.setAttribute(
                    "aria-pressed",
                    String(isActive)
                );
            });

            renderPeople();
        });
    });
}

function openPersonModal() {
    const modal = $("movie-modal");

    if (!modal) {
        return;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");
}

function closePersonModal() {
    const modal = $("movie-modal");

    if (!modal) {
        return;
    }

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    activePersonRequestNumber++;
}

function setupModalClose() {
    const modal = $("movie-modal");

    if (!modal) {
        return;
    }

    modal.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", closePersonModal);
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("active")
        ) {
            closePersonModal();
        }
    });
}

function getMovieCredits(personData) {
    const credits =
        personData.movie_credits ||
        personData.credits ||
        {};

    const cast = Array.isArray(credits.cast)
        ? credits.cast
        : [];

    const crew = Array.isArray(credits.crew)
        ? credits.crew
        : [];

    const combined = [...cast, ...crew];

    const uniqueMovies = new Map();

    combined.forEach(movie => {
        if (!movie.id || !movie.title) {
            return;
        }

        if (!uniqueMovies.has(movie.id)) {
            uniqueMovies.set(movie.id, movie);
        }
    });

    return [...uniqueMovies.values()].sort((a, b) => {
        const dateA = a.release_date || "";
        const dateB = b.release_date || "";

        return dateB.localeCompare(dateA);
    });
}

function createKnownForMovie(movie) {
    const poster = movie.poster_path
        ? getImageURL(movie.poster_path, POSTER_SIZE)
        : "";

    const year = movie.release_date
        ? movie.release_date.slice(0, 4)
        : "Year unknown";

    return `
        <article class="person-movie-card">
            <div class="person-movie-poster">
                ${
                    poster
                        ? `
                            <img
                                src="${poster}"
                                alt="${escapeHTML(movie.title)} poster"
                                loading="lazy"
                            >
                        `
                        : `
                            <div class="poster-fallback">
                                <i data-lucide="film"></i>
                            </div>
                        `
                }
            </div>

            <div class="person-movie-info">
                <h4>${escapeHTML(movie.title)}</h4>
                <p>${escapeHTML(year)}</p>
            </div>
        </article>
    `;
}

function renderPersonDetails(personData) {
    const modal = $("movie-modal");

    if (!modal) {
        return;
    }

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");
    const panel = modal.querySelector(".modal-panel");

    if (!media || !body || !panel) {
        return;
    }

    const person = personData.person || personData;

    const profile = person.profile_path
        ? getImageURL(person.profile_path, PROFILE_SIZE)
        : "";

    const department =
        person.known_for_department ||
        person.department ||
        "Unknown";

    const birthday = person.birthday
        ? formatDate(person.birthday)
        : "Unknown";

    const age = calculateAge(
        person.birthday,
        person.deathday
    );

    const placeOfBirth = person.place_of_birth || "Unknown";

    const biography = person.biography ||
        "No biography is currently available.";

    const movies = getMovieCredits(personData);

    media.innerHTML = `
        <div class="person-modal-profile">
            ${
                profile
                    ? `
                        <img
                            src="${profile}"
                            alt="${escapeHTML(person.name)}"
                        >
                    `
                    : `
                        <div class="person-modal-fallback">
                            ${escapeHTML(getInitials(person.name))}
                        </div>
                    `
            }
        </div>
    `;

    body.innerHTML = `
        <div class="person-modal-details">
            <p class="person-modal-department">
                ${escapeHTML(department)}
            </p>

            <h2>${escapeHTML(person.name || "Unknown Person")}</h2>

            <div class="person-facts">
                <div>
                    <span>Birthday</span>
                    <p>${escapeHTML(birthday)}</p>
                </div>

                ${
                    age
                        ? `
                            <div>
                                <span>Age</span>
                                <p>${escapeHTML(age)}</p>
                            </div>
                        `
                        : ""
                }

                ${
                    person.deathday
                        ? `
                            <div>
                                <span>Passed away</span>
                                <p>${escapeHTML(formatDate(person.deathday))}</p>
                            </div>
                        `
                        : ""
                }

                <div>
                    <span>Place of birth</span>
                    <p>${escapeHTML(placeOfBirth)}</p>
                </div>
            </div>

            <section class="person-biography">
                <h3>Biography</h3>

                <p class="biography-text collapsed">
                    ${escapeHTML(biography)}
                </p>

                ${
                    biography.length > 250
                        ? `
                            <button
                                type="button"
                                class="biography-toggle"
                                aria-expanded="false"
                            >
                                See more
                            </button>
                        `
                        : ""
                }
            </section>
        </div>
    `;

    let knownFor = panel.querySelector(".person-known-for-section");

    if (!knownFor) {
        knownFor = document.createElement("section");
        knownFor.className = "person-known-for-section";
        panel.appendChild(knownFor);
    }

    knownFor.innerHTML = `
        <h3>Known For</h3>

        ${
            movies.length
                ? `
                    <div class="person-movies-grid">
                        ${movies.map(createKnownForMovie).join("")}
                    </div>
                `
                : `
                    <p class="empty-state">
                        No movie credits available.
                    </p>
                `
        }
    `;

    const biographyText = body.querySelector(".biography-text");
    const biographyToggle = body.querySelector(".biography-toggle");

    if (biographyText && biographyToggle) {
        biographyToggle.addEventListener("click", () => {
            const expanded =
                biographyToggle.getAttribute("aria-expanded") === "true";

            biographyText.classList.toggle("collapsed", expanded);

            biographyToggle.setAttribute(
                "aria-expanded",
                String(!expanded)
            );

            biographyToggle.textContent = expanded
                ? "See more"
                : "See less";
        });
    }

    refreshIcons();
}

async function openPersonDetails(personId) {
    const modal = $("movie-modal");

    if (!modal) {
        return;
    }

    const media = modal.querySelector(".modal-media");
    const body = modal.querySelector(".modal-body");
    const panel = modal.querySelector(".modal-panel");

    if (!media || !body || !panel) {
        return;
    }

    const requestNumber = ++activePersonRequestNumber;

    openPersonModal();

    media.innerHTML = `
        <div class="loading-state">
            <p>Loading profile...</p>
        </div>
    `;

    body.innerHTML = `
        <div class="loading-state">
            <p>Loading details...</p>
        </div>
    `;

    const oldKnownFor = panel.querySelector(".person-known-for-section");

    if (oldKnownFor) {
        oldKnownFor.remove();
    }

    try {
        const data = await fetchTMDB("person", {
            id: personId
        });

        if (requestNumber !== activePersonRequestNumber) {
            return;
        }

        renderPersonDetails(data);

    } catch (error) {
        console.error("Unable to load person details:", error);

        if (requestNumber !== activePersonRequestNumber) {
            return;
        }

        media.innerHTML = "";

        body.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load profile</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

function setupPeopleCardEvents() {
    const container = $("people-list");

    if (!container) {
        return;
    }

    container.addEventListener("click", event => {
        const card = event.target.closest("[data-person-id]");

        if (!card) {
            return;
        }

        openPersonDetails(card.dataset.personId);
    });

    container.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        const card = event.target.closest("[data-person-id]");

        if (!card) {
            return;
        }

        event.preventDefault();

        openPersonDetails(card.dataset.personId);
    });
}

function setupPeopleSearch() {
    const searchInput = $("people-search");

    if (!searchInput) {
        return;
    }

    let searchTimeout;

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);

        const query = searchInput.value.trim();

        searchTimeout = setTimeout(() => {
            searchPeople(query);
        }, 400);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    refreshIcons();

    setupRoleFilters();
    setupPeopleSearch();
    setupPeopleCardEvents();
    setupModalClose();

    loadPopularPeople();
});
