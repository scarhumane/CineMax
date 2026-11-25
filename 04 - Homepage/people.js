
const $ = id => document.getElementById(id);

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
    return typeof path === "string" ? path : "";
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

async function fetchLocalPeople() {
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

    const peopleByName = new Map();
    data.movies.forEach(movie => {
        if (!movie || !movie.title) return;

        const credit = {
            id: String(movie.id),
            title: movie.title,
            posterPath: movie.poster || "",
            releaseDate: movie.year || ""
        };
        const addPerson = (name, role, photo = "") => {
            if (typeof name !== "string" || !name.trim()) return;

            const displayName = name.trim();
            const key = displayName.toLocaleLowerCase();
            let person = peopleByName.get(key);
            if (!person) {
                person = {
                    id: `person-${encodeURIComponent(key)}`,
                    name: displayName,
                    roles: new Set(),
                    profilePath: "",
                    knownFor: new Map()
                };
                peopleByName.set(key, person);
            }

            person.roles.add(role);
            if (!person.profilePath && photo) person.profilePath = photo;
            person.knownFor.set(credit.id, credit);
        };

        addPerson(movie.director, "director", movie.director_photo);
        (Array.isArray(movie.cast) ? movie.cast : []).forEach(person => {
            if (typeof person === "string") {
                addPerson(person, "actor");
            } else if (person && typeof person === "object") {
                addPerson(person.name, "actor", person.photo || "");
            }
        });
    });

    return [...peopleByName.values()]
        .map(person => ({
            ...person,
            roles: [...person.roles],
            department: person.roles.has("director") && person.roles.has("actor")
                ? "Actor, Director"
                : person.roles.has("director") ? "Director" : "Actor",
            knownFor: [...person.knownFor.values()]
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
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
            data-person-id="${escapeHTML(person.id)}"
            tabindex="0"
            role="button"
            aria-label="View ${escapeHTML(person.name)}"
        >
            <div class="person-image">
                ${
                    image
                        ? `
                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(person.name)}"
                                loading="lazy"
                                onerror="
                                    this.onerror=null;
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
            return person.roles.includes(activeRole);
        });
    }

    if (!filteredPeople.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No people found</h3>
                <p>Add cast members or a director to movies in the local catalog, or try another search/filter.</p>
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
        people = await fetchLocalPeople();

        if (requestNumber !== peopleRequestNumber) {
            return;
        }

        renderPeople();

    } catch (error) {
        console.error("Unable to load people:", error);

        if (requestNumber !== peopleRequestNumber) {
            return;
        }

        container.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load people</h3>
                <p>${escapeHTML(error.message)}</p>
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
        const catalogPeople = await fetchLocalPeople();

        if (requestNumber !== searchRequestNumber) {
            return;
        }

        const term = query.trim().toLocaleLowerCase();
        people = catalogPeople.filter(person =>
            [
                person.name,
                ...person.roles,
                ...person.knownFor.map(movie => movie.title)
            ].join(" ").toLocaleLowerCase().includes(term)
        );

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
    const poster = getImageURL(movie.posterPath || movie.poster_path, POSTER_SIZE);

    const releaseDate = movie.releaseDate || movie.release_date;
    const year = releaseDate
        ? String(releaseDate).slice(0, 4)
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

    const profile = getImageURL(person.profilePath || person.profile_path, PROFILE_SIZE);

    const department =
        person.roles?.join(", ") ||
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
        "Profile information is managed through the local CineMax movie catalog.";

    const movies = getMovieCredits(personData);

    media.innerHTML = `
        <div class="person-modal-profile">
            ${
                profile
                    ? `
                        <img
                            src="${escapeHTML(profile)}"
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

    const profileImage = media.querySelector("img");
    profileImage?.addEventListener("error", () => {
        const fallback = document.createElement("div");
        fallback.className = "person-modal-fallback";
        fallback.textContent = getInitials(person.name);
        profileImage.replaceWith(fallback);
    }, { once: true });

    body.innerHTML = `
        <div class="person-modal-details">
            <p class="person-modal-department">
                ${escapeHTML(department)}
            </p>

            <h2>${escapeHTML(person.name || "Unknown Person")}</h2>

            ${person.birthday || person.place_of_birth || person.deathday ? `
                <div class="person-facts">
                    ${person.birthday ? `
                        <div>
                            <span>Birthday</span>
                            <p>${escapeHTML(birthday)}</p>
                        </div>
                    ` : ""}
                    ${age ? `
                        <div>
                            <span>Age</span>
                            <p>${escapeHTML(age)}</p>
                        </div>
                    ` : ""}
                    ${person.deathday ? `
                        <div>
                            <span>Passed away</span>
                            <p>${escapeHTML(formatDate(person.deathday))}</p>
                        </div>
                    ` : ""}
                    ${person.place_of_birth ? `
                        <div>
                            <span>Place of birth</span>
                            <p>${escapeHTML(placeOfBirth)}</p>
                        </div>
                    ` : ""}
                </div>
            ` : ""}

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
    const selectedPerson = people.find(person => person.id === personId);

    if (!selectedPerson) return;

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

    if (requestNumber !== activePersonRequestNumber) return;

    renderPersonDetails({
        person: {
            id: selectedPerson.id,
            name: selectedPerson.name,
            profile_path: selectedPerson.profilePath,
            roles: selectedPerson.roles
        },
        movie_credits: {
            cast: selectedPerson.knownFor.map(movie => ({
                id: movie.id,
                title: movie.title,
                poster_path: movie.posterPath,
                release_date: movie.releaseDate
            }))
        }
    });
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
