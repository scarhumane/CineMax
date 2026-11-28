<?php

function cinemax_movie_ratings_file(): string
{
    return dirname(__DIR__)
        . DIRECTORY_SEPARATOR . "03 - Data"
        . DIRECTORY_SEPARATOR . "movie_ratings.json";
}

function cinemax_read_movie_ratings($handle): array
{
    rewind($handle);
    $contents = stream_get_contents($handle);

    if ($contents === false) {
        throw new RuntimeException("Unable to read movie rating data.");
    }

    if ($contents === "") {
        return [];
    }

    $data = json_decode($contents, true);
    if (!is_array($data) || !isset($data["ratings"]) || !is_array($data["ratings"])) {
        throw new RuntimeException("Movie rating data contains invalid JSON.");
    }

    return array_values($data["ratings"]);
}

function cinemax_get_movie_rating_records(): array
{
    $file = cinemax_movie_ratings_file();
    if (!file_exists($file)) {
        return [];
    }

    $handle = fopen($file, "rb");
    if ($handle === false) {
        throw new RuntimeException("Unable to open movie rating data.");
    }

    if (!flock($handle, LOCK_SH)) {
        fclose($handle);
        throw new RuntimeException("Unable to lock movie rating data.");
    }

    try {
        return cinemax_read_movie_ratings($handle);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function cinemax_get_user_movie_ratings(string $username): array
{
    $ratings = [];
    foreach (cinemax_get_movie_rating_records() as $record) {
        if (
            is_array($record)
            && ($record["username"] ?? null) === $username
            && is_string($record["movie_id"] ?? null)
            && is_numeric($record["rating"] ?? null)
        ) {
            $ratings[$record["movie_id"]] = (int) $record["rating"];
        }
    }

    return $ratings;
}

function cinemax_save_user_movie_ratings(string $username, array $newRatings): array
{
    $file = cinemax_movie_ratings_file();
    $directory = dirname($file);

    if (!is_dir($directory) || !is_writable($directory)) {
        throw new RuntimeException("The movie rating data folder is not writable.");
    }

    $handle = fopen($file, "c+");
    if ($handle === false) {
        throw new RuntimeException("Unable to open movie rating data.");
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        throw new RuntimeException("Unable to lock movie rating data.");
    }

    try {
        $records = cinemax_read_movie_ratings($handle);

        foreach ($newRatings as $movieId => $rating) {
            $found = false;
            foreach ($records as &$record) {
                if (
                    is_array($record)
                    && ($record["username"] ?? null) === $username
                    && (string) ($record["movie_id"] ?? "") === (string) $movieId
                ) {
                    $record["rating"] = $rating;
                    $record["updated_at"] = date("c");
                    $found = true;
                    break;
                }
            }
            unset($record);

            if (!$found) {
                $records[] = [
                    "movie_id" => (string) $movieId,
                    "username" => $username,
                    "rating" => $rating,
                    "updated_at" => date("c")
                ];
            }
        }

        $json = json_encode(
            ["ratings" => $records],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
        if ($json === false) {
            throw new RuntimeException("Unable to encode movie rating data.");
        }

        rewind($handle);
        if (!ftruncate($handle, 0)) {
            throw new RuntimeException("Unable to prepare movie rating data for saving.");
        }

        $written = fwrite($handle, $json);
        if ($written !== strlen($json) || !fflush($handle)) {
            throw new RuntimeException("Unable to save movie rating data.");
        }

        return cinemax_ratings_from_records($records, $username);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function cinemax_ratings_from_records(array $records, string $username): array
{
    $ratings = [];
    foreach ($records as $record) {
        if (
            is_array($record)
            && ($record["username"] ?? null) === $username
            && is_string($record["movie_id"] ?? null)
            && is_numeric($record["rating"] ?? null)
        ) {
            $ratings[$record["movie_id"]] = (int) $record["rating"];
        }
    }

    return $ratings;
}

function cinemax_movies_with_average_ratings(array $movies): array
{
    $totals = [];
    foreach (cinemax_get_movie_rating_records() as $record) {
        if (
            !is_array($record)
            || !is_string($record["movie_id"] ?? null)
            || !is_string($record["username"] ?? null)
            || !is_numeric($record["rating"] ?? null)
        ) {
            continue;
        }

        $rating = (float) $record["rating"];
        if ($rating < 1 || $rating > 5) {
            continue;
        }

        $movieId = $record["movie_id"];
        $totals[$movieId]["sum"] = ($totals[$movieId]["sum"] ?? 0) + $rating;
        $totals[$movieId]["count"] = ($totals[$movieId]["count"] ?? 0) + 1;
    }

    foreach ($movies as &$movie) {
        if (!is_array($movie)) {
            continue;
        }

        $movieId = (string) ($movie["id"] ?? "");
        $total = $totals[$movieId] ?? null;
        $movie["rating"] = $total
            ? round($total["sum"] / $total["count"], 1)
            : 0;
        $movie["rating_count"] = $total["count"] ?? 0;
    }
    unset($movie);

    return $movies;
}
