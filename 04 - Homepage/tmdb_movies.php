<?php

require_once __DIR__ . "/tmdb_api.php";

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

header("Content-Type: application/json; charset=utf-8");

function sendJson(array $payload, int $status = 200): void
{
    http_response_code($status);

    // TMDB data is not personal, so the browser may reuse successful
    // responses for a few minutes. Errors are never cached.
    header(
        "Cache-Control: " . (
            $status === 200 ? "private, max-age=600" : "no-store"
        )
    );

    try {
        echo json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES
                | JSON_UNESCAPED_UNICODE
                | JSON_INVALID_UTF8_SUBSTITUTE
                | JSON_THROW_ON_ERROR
        );
    } catch (JsonException $error) {
        error_log(
            "Unable to encode TMDB response: " . $error->getMessage()
        );

        header("Cache-Control: no-store");
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
    sendJson(
        ["error" => "Page must be an integer from 1 to 500."],
        400
    );
    exit;
}

$queryValue = $_GET["query"] ?? "";

if (!is_string($queryValue)) {
    sendJson(["error" => "Query must be a string."], 400);
    exit;
}

$query = trim($queryValue);

if (strlen($query) > 200) {
    sendJson(
        ["error" => "Query must be 200 characters or fewer."],
        400
    );
    exit;
}

$personIdValue = $_GET["person_id"] ?? $_GET["id"] ?? "";
$personId = filter_var($personIdValue, FILTER_VALIDATE_INT);

$movieIdValue = $_GET["movie_id"] ?? $_GET["id"] ?? "";
$movieId = filter_var($movieIdValue, FILTER_VALIDATE_INT);

$genreValue = $_GET["genre"] ?? "";
$genre = is_string($genreValue) && preg_match('/^\d+(?:,\d+)*$/', $genreValue)
    ? $genreValue
    : "";
$from = $_GET["from"] ?? "";
$to = $_GET["to"] ?? "";

if (
    $type === "discover" &&
    $genre === ""
) {
    sendJson(
        ["error" => "A valid movie genre is required."],
        400
    );
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

    case "tv-top-rated":
        $result = getTopRatedTV($page);
        break;

    case "new-releases":
        if (!is_string($from) || !is_string($to) || !DateTime::createFromFormat("!Y-m-d", $from) || !DateTime::createFromFormat("!Y-m-d", $to)) {
            sendJson(["error" => "A valid release date range is required."], 400);
            exit;
        }
        $result = getNewReleases($from, $to, $page);
        break;

    case "upcoming":
        $result = getUpcomingMovies($page);
        break;

    case "tv-binge":
        $result = getBingeWorthyTV($page);
        break;

    case "discover":
        $result = discoverMovies($genre, $page);
        break;

    case "search":
        $result = $query === ""
            ? ["results" => []]
            : searchMovies($query, $page);
        break;

    case "genres":
        $result = getMovieGenres();
        break;

    case "people":
        $result = $query === ""
            ? getPopularPeople($page)
            : searchPeople($query, $page);
        break;

    case "person":
        if ($personId === false || $personId <= 0) {
            sendJson(
                ["error" => "A valid person ID is required."],
                400
            );
            exit;
        }

        $person = getPersonDetails($personId);

        if (isset($person["error"])) {
            $result = $person;
            break;
        }

        $credits = getPersonMovieCredits($personId);

        if (isset($credits["error"])) {
            $result = $credits;
            break;
        }

        $tvCredits = getPersonTVCredits($personId);

        $result = [
            "person" => $person,
            "credits" => $credits,
            "tv_credits" => !isset($tvCredits["error"]) ? $tvCredits : ["cast" => [], "crew" => []]
        ];

        break;

    case "movie":
        if ($movieId === false || $movieId <= 0) {
            sendJson(
                ["error" => "A valid movie ID is required."],
                400
            );
            exit;
        }

        $result = getMovieDetails($movieId);

        if (!isset($result["error"])) {
            $providerData = getMovieWatchProviders($movieId);

            $result["watch_providers"] = !isset($providerData["error"])
                ? ($providerData["results"]["PH"] ?? null)
                : null;
        }

        break;

    case "videos":
        if ($movieId === false || $movieId <= 0) {
            sendJson(
                ["error" => "A valid movie ID is required."],
                400
            );
            exit;
        }

        $details = getMovieDetails($movieId);

        $result = isset($details["error"])
            ? $details
            : [
                "id" => $details["id"] ?? $movieId,
                "videos" => [
                    "results" => $details["videos"]["results"] ?? []
                ]
            ];

        break;

    case "tv":
        if ($movieId === false || $movieId <= 0) {
            sendJson(["error" => "A valid TV show ID is required."], 400);
            exit;
        }

        $result = getTVDetails($movieId);
        break;

    default:
        sendJson(
            ["error" => "Unsupported request type."],
            400
        );
        exit;
}

$status = $result["_status"] ?? 200;
unset($result["_status"]);

if (isset($result["error"]) && $status === 200) {
    $status = 502;
}

sendJson($result, $status);