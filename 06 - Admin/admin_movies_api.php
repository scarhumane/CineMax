<?php

require_once __DIR__ . "/functions.php";

start_session();

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

function admin_movies_respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES
            | JSON_UNESCAPED_UNICODE
            | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function admin_movies_clean_image($value): string
{
    if (!is_string($value)) {
        return "";
    }

    $value = trim($value);

    if ($value === "") {
        return "";
    }

    $parts = parse_url($value);
    if (
        is_array($parts)
        && in_array($parts["scheme"] ?? "", ["https", "http"], true)
        && filter_var($value, FILTER_VALIDATE_URL) !== false
    ) {
        return $value;
    }

    if (
        !str_starts_with($value, "//")
        && !str_contains($value, "..")
        && preg_match('/^[a-zA-Z0-9_./ -]+\.(?:avif|gif|jpe?g|png|webp)$/i', $value)
    ) {
        return $value;
    }

    return "";
}

function admin_movies_valid_image($value): bool
{
    return !is_string($value)
        || trim($value) === ""
        || admin_movies_clean_image($value) !== "";
}

function admin_movies_clean_youtube_url($value): string
{
    if (!is_string($value) || trim($value) === "") {
        return "";
    }

    $parts = parse_url(trim($value));
    if (
        !is_array($parts)
        || ($parts["scheme"] ?? "") !== "https"
        || !in_array(strtolower($parts["host"] ?? ""), [
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtu.be"
        ], true)
    ) {
        return "";
    }

    $host = strtolower($parts["host"]);
    $path = $parts["path"] ?? "";
    if ($host === "youtu.be") {
        $videoId = trim($path, "/");
    } elseif (preg_match('#^/(?:embed|shorts)/([A-Za-z0-9_-]{11})/?$#', $path, $match)) {
        $videoId = $match[1];
    } else {
        parse_str($parts["query"] ?? "", $query);
        $videoId = is_string($query["v"] ?? null) ? $query["v"] : "";
    }

    if (!preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId)) {
        return "";
    }

    return "https://www.youtube-nocookie.com/embed/" . $videoId;
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if (!in_array($method, ["GET", "POST", "DELETE"], true)) {
    header("Allow: GET, POST, DELETE");
    admin_movies_respond(["error" => "Unsupported request method."], 405);
}

if ($method !== "GET" && ($_SESSION["logged_in"] ?? false) !== true) {
    admin_movies_respond(["error" => "Please sign in first."], 401);
}

if ($method !== "GET" && !current_user_is_admin()) {
    admin_movies_respond(["error" => "Administrator access is required."], 403);
}

if ($method !== "GET") {
    $providedToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
    $sessionToken = $_SESSION["admin_csrf_token"] ?? "";

    if (
        !is_string($providedToken)
        || !is_string($sessionToken)
        || $sessionToken === ""
        || !hash_equals($sessionToken, $providedToken)
    ) {
        admin_movies_respond(["error" => "Your session expired. Reload the page and try again."], 403);
    }
}

$dataFile = dirname(__DIR__)
    . DIRECTORY_SEPARATOR . "03 - Data"
    . DIRECTORY_SEPARATOR . "admin_movies.json";
$dataDirectory = dirname($dataFile);

if (!is_dir($dataDirectory) || !is_writable($dataDirectory)) {
    admin_movies_respond(["error" => "The movie data folder is not writable."], 500);
}

$handle = fopen($dataFile, "c+");

if ($handle === false) {
    admin_movies_respond(["error" => "Unable to open the movie data file."], 500);
}

$lock = $method === "GET" ? LOCK_SH : LOCK_EX;

if (!flock($handle, $lock)) {
    fclose($handle);
    admin_movies_respond(["error" => "Unable to access the movie data file."], 500);
}

$contents = stream_get_contents($handle);
$data = $contents === "" ? ["movies" => []] : json_decode($contents, true);

if (!is_array($data) || !isset($data["movies"]) || !is_array($data["movies"])) {
    flock($handle, LOCK_UN);
    fclose($handle);
    admin_movies_respond(["error" => "The movie data file contains invalid data."], 500);
}

$movies = array_values($data["movies"]);

if ($method === "GET") {
    flock($handle, LOCK_UN);
    fclose($handle);
    admin_movies_respond(["success" => true, "movies" => $movies]);
}

$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
    flock($handle, LOCK_UN);
    fclose($handle);
    admin_movies_respond(["error" => "Invalid request data."], 400);
}

if ($method === "POST") {
    $id = trim(is_string($input["id"] ?? null) ? $input["id"] : "");
    $title = trim(is_string($input["title"] ?? null) ? $input["title"] : "");
    $yearValue = $input["year"] ?? "";
    $year = $yearValue === "" ? "" : filter_var($yearValue, FILTER_VALIDATE_INT);
    $genresValue = $input["genres"] ?? "";
    $genres = is_string($genresValue)
        ? preg_split('/[,;\n]+/', $genresValue)
        : [];
    $genres = array_values(array_unique(array_filter(array_map(
        static fn($genre) => trim(substr((string) $genre, 0, 40)),
        array_slice($genres ?: [], 0, 12)
    ))));
    $director = trim(is_string($input["director"] ?? null) ? $input["director"] : "");
    $directorPhoto = admin_movies_clean_image($input["director_photo"] ?? "");
    $rating = 0;
    $youtubeInput = $input["youtube_url"] ?? "";
    $youtubeUrl = admin_movies_clean_youtube_url($youtubeInput);
    $description = trim(
        is_string($input["description"] ?? null)
            ? $input["description"]
            : ""
    );
    $poster = admin_movies_clean_image($input["poster"] ?? "");
    $backdrop = admin_movies_clean_image($input["backdrop"] ?? "");
    $castInput = $input["cast"] ?? "";
    $cast = [];

    if (strlen($id) > 80 || ($id !== "" && !preg_match('/^[a-zA-Z0-9_-]+$/', $id))) {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "Catalog ID may only contain letters, numbers, hyphens, and underscores."], 400);
    }

    if ($id === "") {
        $id = "movie-" . bin2hex(random_bytes(6));
    }

    if ($title === "" || strlen($title) > 160) {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "Movie title is required and must be 160 characters or fewer."], 400);
    }

    if ($year === false || ($year !== "" && ($year < 1888 || $year > 2100))) {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "Release year must be from 1888 to 2100."], 400);
    }

    if (strlen($description) > 2000 || strlen($director) > 120 || count($genres) > 12) {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "Check the synopsis, director, and genre limits."], 400);
    }

    if (
        !admin_movies_valid_image($input["poster"] ?? "")
        || !admin_movies_valid_image($input["backdrop"] ?? "")
        || !admin_movies_valid_image($input["director_photo"] ?? "")
    ) {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "Artwork must use an HTTPS image URL or a local image path."], 400);
    }

    if (
        is_string($youtubeInput)
        && trim($youtubeInput) !== ""
        && $youtubeUrl === ""
    ) {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "Enter a valid HTTPS YouTube watch, short, or embed link."], 400);
    }

    foreach (preg_split('/\r\n|\r|\n/', is_string($castInput) ? $castInput : "") as $line) {
        $line = trim($line);
        if ($line === "") {
            continue;
        }

        $castParts = array_pad(explode("|", $line, 2), 2, "");
        $name = trim($castParts[0]);
        $image = trim($castParts[1]);

        if ($name === "" || strlen($name) > 120) {
            flock($handle, LOCK_UN);
            fclose($handle);
            admin_movies_respond(["error" => "Each cast member needs a name of 120 characters or fewer."], 400);
        }

        $cast[] = [
            "name" => $name,
            "photo" => admin_movies_clean_image($image)
        ];

        if (!admin_movies_valid_image($image)) {
            flock($handle, LOCK_UN);
            fclose($handle);
            admin_movies_respond(["error" => "Cast photos must use an HTTPS image URL or a local image path."], 400);
        }

        if (count($cast) >= 30) {
            break;
        }
    }

    foreach ($movies as $movie) {
        if ((string) ($movie["id"] ?? "") === $id) {
            flock($handle, LOCK_UN);
            fclose($handle);
            admin_movies_respond(["error" => "That movie is already in the CineMax Collection."], 409);
        }
    }

    $movies[] = [
        "id" => $id,
        "title" => $title,
        "youtube_url" => $youtubeUrl,
        "year" => $year === "" ? "" : (string) $year,
        "description" => $description,
        "poster" => $poster,
        "backdrop" => $backdrop,
        "genres" => $genres,
        "rating" => $rating,
        "director" => $director,
        "director_photo" => $directorPhoto,
        "cast" => $cast
    ];
} else {
    $id = is_string($input["id"] ?? null) || is_numeric($input["id"] ?? null)
        ? (string) $input["id"]
        : "";

    if ($id === "") {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "A valid catalog movie ID is required."], 400);
    }

    $initialCount = count($movies);
    $movies = array_values(array_filter(
        $movies,
        static fn($movie) => (string) ($movie["id"] ?? "") !== $id
    ));

    if (count($movies) === $initialCount) {
        flock($handle, LOCK_UN);
        fclose($handle);
        admin_movies_respond(["error" => "That movie is not in the CineMax Collection."], 404);
    }
}

$json = json_encode(
    ["movies" => $movies],
    JSON_PRETTY_PRINT
        | JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE
        | JSON_INVALID_UTF8_SUBSTITUTE
);

if ($json === false) {
    flock($handle, LOCK_UN);
    fclose($handle);
    admin_movies_respond(["error" => "Unable to encode the movie data."], 500);
}

rewind($handle);
ftruncate($handle, 0);
$written = fwrite($handle, $json);
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

if ($written === false) {
    admin_movies_respond(["error" => "Unable to save the movie data."], 500);
}

admin_movies_respond(["success" => true, "movies" => $movies]);
