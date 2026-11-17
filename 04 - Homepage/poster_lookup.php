<?php

require_once __DIR__ . "/functions.php";

start_session();

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

function poster_lookup_respond(array $payload, int $status = 200): void
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

if (($_SESSION["logged_in"] ?? false) !== true || !current_user_is_admin()) {
    poster_lookup_respond(["error" => "Administrator access is required."], 403);
}

if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
    header("Allow: POST");
    poster_lookup_respond(["error" => "Unsupported request method."], 405);
}

$providedToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
$sessionToken = $_SESSION["admin_csrf_token"] ?? "";
if (
    !is_string($providedToken)
    || !is_string($sessionToken)
    || $sessionToken === ""
    || !hash_equals($sessionToken, $providedToken)
) {
    poster_lookup_respond(["error" => "Your session expired. Reload the page and try again."], 403);
}

$input = json_decode(file_get_contents("php://input"), true);
$title = is_array($input) && is_string($input["title"] ?? null)
    ? trim($input["title"])
    : "";
if ($title === "" || strlen($title) > 160) {
    poster_lookup_respond(["error" => "Enter a movie title of 160 characters or fewer."], 400);
}

$apiKey = getenv("TMDB_API_KEY");
if (!is_string($apiKey) || trim($apiKey) === "") {
    poster_lookup_respond([
        "error" => "Poster lookup is not configured. Set TMDB_API_KEY in the PHP server environment."
    ], 503);
}

if (!filter_var(ini_get("allow_url_fopen"), FILTER_VALIDATE_BOOLEAN)) {
    poster_lookup_respond(["error" => "Enable allow_url_fopen in PHP to use poster lookup."], 503);
}

$url = "https://api.themoviedb.org/3/search/movie?"
    . http_build_query([
        "api_key" => trim($apiKey),
        "query" => $title,
        "include_adult" => "false",
        "language" => "en-US",
        "page" => 1
    ]);
$context = stream_context_create([
    "http" => [
        "method" => "GET",
        "timeout" => 15,
        "ignore_errors" => true,
        "follow_location" => 0,
        "header" => "Accept: application/json\r\n"
    ]
]);

$streamWarning = "";
set_error_handler(static function (int $severity, string $message) use (&$streamWarning): bool {
    $streamWarning = $message;
    return true;
});
$response = file_get_contents($url, false, $context);
restore_error_handler();

if ($response === false) {
    error_log("TMDB poster lookup failed: " . $streamWarning);
    poster_lookup_respond(["error" => "Unable to reach the poster service."], 502);
}

$statusLine = $http_response_header[0] ?? "";
if (!preg_match('/\s(\d{3})\s/', $statusLine, $statusMatch)) {
    error_log("TMDB poster lookup did not return an HTTP status.");
    poster_lookup_respond(["error" => "The poster service returned an invalid response."], 502);
}
$status = (int) $statusMatch[1];

if ($status < 200 || $status >= 300) {
    error_log("TMDB poster lookup returned HTTP status " . $status);
    poster_lookup_respond(["error" => "The poster service rejected the request."], 502);
}

$data = json_decode($response, true);
if (!is_array($data) || !is_array($data["results"] ?? null)) {
    error_log("TMDB poster lookup returned invalid JSON.");
    poster_lookup_respond(["error" => "The poster service returned an invalid response."], 502);
}

foreach ($data["results"] as $result) {
    $posterPath = $result["poster_path"] ?? "";
    if (
        is_string($posterPath)
        && preg_match('#^/[A-Za-z0-9._/-]+$#', $posterPath)
        && !str_contains($posterPath, "..")
    ) {
        poster_lookup_respond([
            "success" => true,
            "poster_url" => "https://image.tmdb.org/t/p/w500" . $posterPath
        ]);
    }
}

poster_lookup_respond(["error" => "No poster was found for that title."], 404);
