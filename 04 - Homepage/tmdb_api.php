
<?php

require_once __DIR__ . "/tmdb_config.php";

function tmdbRequest(string $endpoint, array $parameters = []): array
{
    if (!defined("TMDB_API_KEY") || TMDB_API_KEY === "") {
        return [
            "error" => "TMDB_API_KEY is not configured.",
            "_status" => 503
        ];
    }

    if (!function_exists("curl_init")) {
        return [
            "error" => "The PHP cURL extension is not available.",
            "_status" => 503
        ];
    }

    $endpoint = "/" . ltrim($endpoint, "/");
    $parameters["api_key"] = TMDB_API_KEY;

    $url = rtrim(TMDB_BASE_URL, "/")
        . $endpoint
        . "?"
        . http_build_query($parameters);

    $handle = curl_init($url);

    if ($handle === false) {
        return [
            "error" => "Unable to initialize the TMDB request.",
            "_status" => 502
        ];
    }

    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            "Accept: application/json"
        ],
        CURLOPT_FOLLOWLOCATION => false
    ]);

    $response = curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);

    if ($response === false) {
        error_log("TMDB connection failed: " . curl_error($handle));
        curl_close($handle);

        return [
            "error" => "Unable to connect to TMDB.",
            "_status" => 502
        ];
    }

    curl_close($handle);

    if ($status < 200 || $status >= 300) {
        error_log("TMDB returned HTTP status " . $status);

        return [
            "error" => "TMDB request failed.",
            "_status" => 502
        ];
    }

    $data = json_decode($response, true);

    if (!is_array($data)) {
        error_log("TMDB returned invalid JSON.");

        return [
            "error" => "TMDB returned an invalid response.",
            "_status" => 502
        ];
    }

    return $data;
}

function getPopularMovies(int $page = 1): array
{
    return tmdbRequest("/movie/popular", [
        "language" => "en-US",
        "page" => max(1, $page)
    ]);
}

function getTrendingMovies(): array
{
    return tmdbRequest("/trending/movie/week", [
        "language" => "en-US"
    ]);
}

function getTopRatedMovies(int $page = 1): array
{
    return tmdbRequest("/movie/top_rated", [
        "language" => "en-US",
        "page" => max(1, $page)
    ]);
}

function getMoviesByGenre(int $genre, int $page = 1): array
{
    if ($genre <= 0) {
        return [
            "error" => "A valid genre ID is required.",
            "_status" => 400
        ];
    }

    return tmdbRequest("/discover/movie", [
        "language" => "en-US",
        "sort_by" => "popularity.desc",
        "with_genres" => $genre,
        "page" => max(1, $page)
    ]);
}

function searchMovies(string $query, int $page = 1): array
{
    $query = trim($query);

    if ($query === "") {
        return [
            "page" => 1,
            "results" => [],
            "total_pages" => 0,
            "total_results" => 0
        ];
    }

    return tmdbRequest("/search/movie", [
        "query" => $query,
        "language" => "en-US",
        "page" => max(1, $page),
        "include_adult" => "false"
    ]);
}

function searchPeople(string $query, int $page = 1): array
{
    $query = trim($query);

    if ($query === "") {
        return [
            "page" => 1,
            "results" => [],
            "total_pages" => 0,
            "total_results" => 0
        ];
    }

    return tmdbRequest("/search/person", [
        "query" => $query,
        "language" => "en-US",
        "page" => max(1, $page),
        "include_adult" => "false"
    ]);
}

function getPopularPeople(int $page = 1): array
{
    return tmdbRequest("/person/popular", [
        "language" => "en-US",
        "page" => max(1, $page)
    ]);
}

function getPersonDetails(int $personId): array
{
    return tmdbRequest("/person/" . $personId, [
        "language" => "en-US"
    ]);
}

function getPersonMovieCredits(int $personId): array
{
    return tmdbRequest("/person/" . $personId . "/movie_credits", [
        "language" => "en-US"
    ]);
}

function getMovieGenres(): array
{
    return tmdbRequest("/genre/movie/list", [
        "language" => "en-US"
    ]);
}

function getMovieDetails(int $movieId): array
{
    if ($movieId <= 0) {
        return [
            "error" => "A valid movie ID is required.",
            "_status" => 400
        ];
    }

    return tmdbRequest("/movie/" . $movieId, [
        "language" => "en-US",
        "append_to_response" => "credits,videos,recommendations"
    ]);
}

function getMovieWatchProviders(int $movieId): array
{
    if ($movieId <= 0) {
        return [
            "error" => "A valid movie ID is required.",
            "_status" => 400
        ];
    }

    return tmdbRequest("/movie/" . $movieId . "/watch/providers");
}
