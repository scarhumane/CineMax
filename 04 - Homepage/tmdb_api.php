
<?php

require_once __DIR__ . "/tmdb_config.php";

/*Fetch movie data from TMDB.*/
function tmdbRequest($endpoint, $parameters = [])
{
    $parameters["api_key"] = TMDB_API_KEY;

    $url = TMDB_BASE_URL . $endpoint . "?" . http_build_query($parameters);

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($response === false) {
        curl_close($ch);
        return ["error" => "Unable to connect to TMDB."];
    }

    curl_close($ch);

    if ($httpCode !== 200) {
        return ["error" => "TMDB request failed."];
    }

    return json_decode($response, true);
}

/* Return popular movies.*/
function getPopularMovies($page = 1)
{
    return tmdbRequest("/movie/popular", [
        "language" => "en-US",
        "page" => $page
    ]);
}

/*Return trending movies.*/
function getTrendingMovies()
{
    return tmdbRequest("/trending/movie/week");
}

/*Return top-rated movies.*/
function getTopRatedMovies($page = 1)
{
    return tmdbRequest("/movie/top_rated", [
        "language" => "en-US",
        "page" => $page
    ]);
}

/* Search for movies.*/
function searchMovies($query)
{
    return tmdbRequest("/search/movie", [
        "query" => $query,
        "language" => "en-US"
    ]);
}

/* Search for actors and directors.*/
function searchPeople($query)
{
    return tmdbRequest("/search/person", [
        "query" => $query,
        "language" => "en-US"
    ]);
}