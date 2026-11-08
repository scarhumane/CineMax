<?php

require_once __DIR__ . "/tmdb_api.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

function sendJson(array $payload, int $status = 200): void
{
    http_response_code($status);

    try {
        echo json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES
                | JSON_UNESCAPED_UNICODE
                | JSON_INVALID_UTF8_SUBSTITUTE
                | JSON_THROW_ON_ERROR
        );
    } catch (JsonException $error) {
        error_log("Unable to encode TMDB response: " . $error->getMessage());
        http_response_code(500);
        echo '{"error":"Unable to encode the movie service response."}';
    }
}

$type = $_GET["type"] ?? "trending";

if (!is_string($type)) {
    sendJson(["error" => "Invalid request type."], 400);
    exit;
}

$pageValue = $_GET["page"] ?? "1";
$page = filter_var($pageValue, FILTER_VALIDATE_INT);

if ($page === false || $page < 1 || $page > 500) {
    sendJson(["error" => "Page must be an integer from 1 to 500."], 400);
    exit;
}

$queryValue = $_GET["query"] ?? "";

if (!is_string($queryValue)) {
    sendJson(["error" => "Query must be a string."], 400);
    exit;
}

$query = trim($queryValue);

if (strlen($query) > 200) {
    sendJson(["error" => "Query must be 200 characters or fewer."], 400);
    exit;
}

$personIdValue = $_GET["person_id"] ?? "";
$personId = filter_var($personIdValue, FILTER_VALIDATE_INT);

$genreValue = $_GET["genre"] ?? "";
$genre = filter_var($genreValue, FILTER_VALIDATE_INT);
$validGenres = [
    12, 14, 16, 18, 27, 28, 35, 36, 37, 53,
    80, 99, 878, 9648, 10402, 10749, 10751, 10752, 10770
];

if ($type === "discover" && (
    $genre === false ||
    !in_array($genre, $validGenres, true)
)) {
    sendJson(["error" => "A valid movie genre is required."], 400);
    exit;
}

switch ($type) {
    case "trending":
        $result = getTrendingMovies();
        break;

    case "popular":
        $result = getPopularMovies($page);
        break;

    case "top-rated":
        $result = getTopRatedMovies($page);
        break;

    case "discover":
        $result = getMoviesByGenre($genre, $page);
        break;

    case "search":
        $result = $query === ""
            ? ["results" => []]
            : searchMovies($query);
        break;

    case "people":
    $result = $query === ""
        ? getPopularPeople($page)
        : searchPeople($query, $page);
    break;

    case "person":
    if (
        $personId === false ||
        $personId <= 0
    ) {
        sendJson(["error" => "A valid person ID is required."], 400);
        exit;
    }

    $person = getPersonDetails($personId);
    $credits = getPersonMovieCredits($personId);

    if (isset($person["error"])) {
        $result = $person;
    } elseif (isset($credits["error"])) {
        $result = $credits;
    } else {
        $result = [
            "person" => $person,
            "credits" => $credits
        ];
    }
    break;
}

$status = $result["_status"] ?? 200;
unset($result["_status"]);

if (isset($result["error"]) && $status === 200) {
    $status = 502;
}

sendJson($result, $status);
