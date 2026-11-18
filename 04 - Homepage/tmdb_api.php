<?php

$configFile = __DIR__ . "/tmdb_config.php";

if (is_file($configFile)) {
    require_once $configFile;
}

/*TMDB CACHE*/

function tmdbCacheDuration(string $endpoint): int
{
    if ($endpoint === "/genre/movie/list") {
        return 86400; // 24 hours
    }

    if (str_starts_with($endpoint, "/search/")) {
        return 300; // 5 minutes
    }

    if (str_starts_with($endpoint, "/movie/") ||
        str_starts_with($endpoint, "/person/")) {
        return 21600; // 6 hours
    }

    if ($endpoint === "/trending/movie/week") {
        return 900; // 15 minutes
    }

    if (
        $endpoint === "/movie/popular" ||
        $endpoint === "/movie/top_rated" ||
        $endpoint === "/discover/movie"
    ) {
        return 1800; // 30 minutes
    }

    return 900;
}

function tmdbReadCache(string $cacheFile, int $duration): ?array
{
    if (!is_file($cacheFile)) {
        return null;
    }

    $modified = filemtime($cacheFile);

    if ($modified === false || time() - $modified > $duration) {
        return null;
    }

    $contents = file_get_contents($cacheFile);

    if ($contents === false) {
        return null;
    }

    $data = json_decode($contents, true);

    return is_array($data) ? $data : null;
}

function tmdbWriteCache(string $cacheFile, array $data): void
{
    try {
        $encoded = json_encode(
            $data,
            JSON_UNESCAPED_SLASHES |
            JSON_UNESCAPED_UNICODE |
            JSON_INVALID_UTF8_SUBSTITUTE |
            JSON_THROW_ON_ERROR
        );

        file_put_contents($cacheFile, $encoded, LOCK_EX);
    } catch (Throwable $error) {
        error_log("Unable to write TMDB cache: " . $error->getMessage());
    }
}

/*TMDB REQUEST*/

function tmdbRequest(string $endpoint, array $parameters = []): array
{
    $apiKey = defined("TMDB_API_KEY")
        ? trim((string) TMDB_API_KEY)
        : "";

    if ($apiKey === "") {
        $environmentKey = getenv("TMDB_API_KEY");
        $apiKey = $environmentKey === false
            ? ""
            : trim($environmentKey);
    }

    if ($apiKey === "") {
        return [
            "error" => "TMDB_API_KEY is not configured.",
            "_status" => 503
        ];
    }

    $endpoint = "/" . ltrim($endpoint, "/");
    // Keep cache keys consistent regardless of parameter order.
    ksort($parameters);

    $cacheKey = hash(
        "sha256",
        $endpoint . "?" . http_build_query($parameters)
    );

    $cacheDirectory = sys_get_temp_dir()
        . DIRECTORY_SEPARATOR
        . "cinemax_tmdb_cache";

    if (!is_dir($cacheDirectory)) {
        if (!mkdir($cacheDirectory, 0775, true) && !is_dir($cacheDirectory)) {
            error_log("Unable to create CineMax TMDB cache directory.");
        }
    }

    $cacheFile = $cacheDirectory
        . DIRECTORY_SEPARATOR
        . $cacheKey
        . ".json";

    $cacheDuration = tmdbCacheDuration($endpoint);

    // Return cached data before making another API request.
    if (is_dir($cacheDirectory)) {
        $cachedData = tmdbReadCache($cacheFile, $cacheDuration);

        if ($cachedData !== null) {
            return $cachedData;
        }
    }

    $parameters["api_key"] = $apiKey;

    $baseUrl = defined("TMDB_BASE_URL")
        ? rtrim(trim((string) TMDB_BASE_URL), "/")
        : "https://api.themoviedb.org/3";

    if ($baseUrl === "") {
        return [
            "error" => "TMDB_BASE_URL is not configured.",
            "_status" => 503
        ];
    }

    $url = $baseUrl
        . $endpoint
        . "?"
        . http_build_query($parameters);

    if (function_exists("curl_init")) {
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
            CURLOPT_ENCODING => "",
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
    } else {
        $streamWarning = null;
        $context = stream_context_create([
            "http" => [
                "method" => "GET",
                "timeout" => 15,
                "ignore_errors" => true,
                "follow_location" => 0,
                "header" => "Accept: application/json"
            ]
        ]);

        set_error_handler(
            static function (
                int $severity,
                string $message
            ) use (&$streamWarning): bool {
                $streamWarning = $message;
                return true;
            },
            E_WARNING
        );

        try {
            $response = file_get_contents($url, false, $context);
        } finally {
            restore_error_handler();
        }

        if ($response === false) {
            error_log(
                "TMDB connection failed: "
                . ($streamWarning ?? "Unable to read the response.")
            );

            return [
                "error" => "Unable to connect to TMDB.",
                "_status" => 502
            ];
        }

        $status = 0;
        $statusLine = $http_response_header[0] ?? "";

        if (preg_match('/\s(\d{3})(?:\s|$)/', $statusLine, $matches)) {
            $status = (int) $matches[1];
        }
    }

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

    // Cache only successful responses.
    if (is_dir($cacheDirectory)) {
        tmdbWriteCache($cacheFile, $data);
    }

    return $data;
}

/*MOVIE FUNCTIONS*/

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

function getTopRatedTV(int $page = 1): array
{
    return tmdbRequest("/tv/top_rated", [
        "language" => "en-US",
        "page" => max(1, $page)
    ]);
}

function getTVDetails(int $tvId): array
{
    if ($tvId <= 0) {
        return ["error" => "A valid TV show ID is required.", "_status" => 400];
    }

    return tmdbRequest("/tv/" . $tvId, [
        "language" => "en-US",
        "append_to_response" => "credits,videos,recommendations"
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

function discoverMovies(string $genres, int $page = 1, array $dates = []): array
{
    return tmdbRequest("/discover/movie", array_merge([
        "language" => "en-US",
        "sort_by" => "popularity.desc",
        "with_genres" => $genres,
        "page" => max(1, $page)
    ], $dates));
}

function getNewReleases(string $from, string $to, int $page = 1): array
{
    return discoverMovies("", $page, [
        "sort_by" => "release_date.desc",
        "release_date.gte" => $from,
        "release_date.lte" => $to,
        "with_release_type" => "2|3"
    ]);
}

function getUpcomingMovies(int $page = 1): array
{
    return tmdbRequest("/movie/upcoming", ["language" => "en-US", "page" => max(1, $page)]);
}

function getBingeWorthyTV(int $page = 1): array
{
    return tmdbRequest("/discover/tv", [
        "language" => "en-US",
        "sort_by" => "popularity.desc",
        "with_status" => "3",
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

/*PEOPLE FUNCTIONS*/

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

function getPersonTVCredits(int $personId): array
{
    return tmdbRequest("/person/" . $personId . "/tv_credits", [
        "language" => "en-US"
    ]);
}

/*GENRE FUNCTIONS*/

function getMovieGenres(): array
{
    return tmdbRequest("/genre/movie/list", [
        "language" => "en-US"
    ]);
}

/*MOVIE DETAILS AND WATCH PROVIDERS*/

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
