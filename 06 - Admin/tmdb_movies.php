<?php

require_once __DIR__ . "/../04 - Homepage/functions.php";
require_once __DIR__ . "/tmdb_api.php";

start_session();

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

function tmdb_movies_respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

if (($_SESSION["logged_in"] ?? false) !== true || !current_user_is_admin()) {
    tmdb_movies_respond(["error" => "Administrator access is required."], 403);
}

if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
    header("Allow: POST");
    tmdb_movies_respond(["error" => "Unsupported request method."], 405);
}

$providedToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
$sessionToken = $_SESSION["admin_csrf_token"] ?? "";
if (
    !is_string($providedToken)
    || !is_string($sessionToken)
    || $sessionToken === ""
    || !hash_equals($sessionToken, $providedToken)
) {
    tmdb_movies_respond(["error" => "Your session expired. Reload the page and try again."], 403);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input) || !is_string($input["action"] ?? null)) {
    tmdb_movies_respond(["error" => "Invalid request data."], 400);
}

$action = $input["action"];

try {
    if ($action === "search") {
        $query = trim(is_string($input["query"] ?? null) ? $input["query"] : "");
        if ($query === "" || strlen($query) > 160) {
            tmdb_movies_respond(["error" => "Enter a movie title of 160 characters or fewer."], 400);
        }

        $data = tmdb_admin_api_get("search/movie", [
            "query" => $query,
            "include_adult" => "false",
            "language" => "en-US",
            "page" => 1
        ]);
        if (!is_array($data["results"] ?? null)) {
            throw new RuntimeException("TMDB returned an invalid search response.", 502);
        }

        $results = [];
        foreach (array_slice($data["results"], 0, 15) as $result) {
            if (
                !is_array($result)
                || !is_numeric($result["id"] ?? null)
                || !is_string($result["title"] ?? null)
            ) {
                continue;
            }

            $releaseDate = $result["release_date"] ?? "";
            $results[] = [
                "id" => (int) $result["id"],
                "title" => $result["title"],
                "year" => is_string($releaseDate) && preg_match('/^\d{4}/', $releaseDate)
                    ? substr($releaseDate, 0, 4)
                    : "",
                "overview" => is_string($result["overview"] ?? null)
                    ? $result["overview"]
                    : "",
                "poster" => tmdb_admin_image_url($result["poster_path"] ?? "", "w500")
            ];
        }

        tmdb_movies_respond(["success" => true, "results" => $results]);
    }

    if ($action === "details") {
        $movieId = filter_var($input["tmdb_id"] ?? null, FILTER_VALIDATE_INT);
        if (!$movieId || $movieId < 1) {
            tmdb_movies_respond(["error" => "Select a valid TMDB movie."], 400);
        }

        $data = tmdb_admin_api_get("movie/" . $movieId, [
            "language" => "en-US",
            "append_to_response" => "credits"
        ]);
        if (!is_string($data["title"] ?? null) || trim($data["title"]) === "") {
            throw new RuntimeException("TMDB did not provide a movie title.", 502);
        }

        $director = null;
        $crew = $data["credits"]["crew"] ?? [];
        if (is_array($crew)) {
            foreach ($crew as $person) {
                if (
                    is_array($person)
                    && ($person["job"] ?? "") === "Director"
                    && is_string($person["name"] ?? null)
                ) {
                    $director = $person;
                    break;
                }
            }
        }

        $cast = [];
        $castMembers = $data["credits"]["cast"] ?? [];
        if (is_array($castMembers)) {
            foreach (array_slice($castMembers, 0, 30) as $person) {
                if (!is_array($person) || !is_string($person["name"] ?? null)) {
                    continue;
                }

                $cast[] = [
                    "name" => $person["name"],
                    "photo" => tmdb_admin_image_url($person["profile_path"] ?? "", "w185")
                ];
            }
        }

        $genres = [];
        foreach (is_array($data["genres"] ?? null) ? $data["genres"] : [] as $genre) {
            if (is_array($genre) && is_string($genre["name"] ?? null)) {
                $genres[] = $genre["name"];
            }
        }

        $releaseDate = $data["release_date"] ?? "";
        tmdb_movies_respond([
            "success" => true,
            "movie" => [
                "id" => "tmdb-" . $movieId,
                "title" => $data["title"],
                "year" => is_string($releaseDate) && preg_match('/^\d{4}/', $releaseDate)
                    ? substr($releaseDate, 0, 4)
                    : "",
                "description" => is_string($data["overview"] ?? null)
                    ? $data["overview"]
                    : "",
                "poster" => tmdb_admin_image_url($data["poster_path"] ?? "", "w500"),
                "backdrop" => tmdb_admin_image_url($data["backdrop_path"] ?? "", "w1280"),
                "genres" => implode(", ", $genres),
                "director" => is_array($director) ? ($director["name"] ?? "") : "",
                "director_photo" => is_array($director)
                    ? tmdb_admin_image_url($director["profile_path"] ?? "", "w185")
                    : "",
                "cast" => $cast
            ]
        ]);
    }

    tmdb_movies_respond(["error" => "Unsupported TMDB action."], 400);
} catch (RuntimeException $error) {
    error_log("TMDB movie import failed: " . $error->getMessage());
    tmdb_movies_respond(
        ["error" => $error->getMessage()],
        $error->getCode() >= 400 && $error->getCode() < 600
            ? $error->getCode()
            : 502
    );
}
