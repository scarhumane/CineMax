
<?php
require_once __DIR__ . "/tmdb_api.php";

header("Content-Type: application/json; charset=utf-8");

$type = $_GET["type"] ?? "trending";

// Validate page number
$page = filter_input(INPUT_GET, "page", FILTER_VALIDATE_INT);

if ($page === false || $page === null || $page < 1 || $page > 500) {
    $page = 1;
}

// Get and clean search query
$query = trim($_GET["query"] ?? "");

try {
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

        case "search":
            $result = $query === ""
                ? ["results" => []]
                : searchMovies($query);
            break;

        case "people":
            $result = $query === ""
                ? ["results" => []]
                : searchPeople($query);
            break;

        default:
            http_response_code(400);
            $result = [
                "error" => "Invalid request type."
            ];
            break;
    }

    echo json_encode(
        $result,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    
} catch (Throwable $error) {
    http_response_code(500);

    error_log("TMDB ERROR: " . $error->getMessage());

    echo json_encode([
        "error" => $error->getMessage()
    ]);
}