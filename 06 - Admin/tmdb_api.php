<?php

function tmdb_admin_api_key(): string
{
    $apiKey = getenv("c001baa8cde60365287ae769c5fd55d6");
    if (!is_string($apiKey) || trim($apiKey) === "") {
        $apiKey = $_ENV["TMDB_API_KEY"] ?? $_SERVER["TMDB_API_KEY"] ?? null;
    }

    if (!is_string($apiKey) || trim($apiKey) === "") {
        $configPath = __DIR__ . "/../04 - Homepage/tmdb_config.php";
        if (is_readable($configPath)) {
            $configuredKey = require $configPath;
            if (is_string($configuredKey)) {
                $apiKey = $configuredKey;
            }
        }
    }

    if (!is_string($apiKey) || trim($apiKey) === "") {
        throw new RuntimeException("TMDB_API_KEY is not configured.", 503);
    }

    if (!filter_var(ini_get("allow_url_fopen"), FILTER_VALIDATE_BOOLEAN)) {
        throw new RuntimeException("Enable allow_url_fopen in PHP to use TMDB.", 503);
    }

    if (!extension_loaded("openssl")) {
        throw new RuntimeException(
            "Enable the PHP OpenSSL extension to make HTTPS requests to TMDB.",
            503
        );
    }

    return trim($apiKey);
}

function tmdb_admin_api_get(string $path, array $parameters = []): array
{
    if (!preg_match('#^[A-Za-z0-9/_-]+$#', $path)) {
        throw new RuntimeException("Invalid TMDB endpoint.");
    }

    $query = array_merge($parameters, ["api_key" => tmdb_admin_api_key()]);
    $url = "https://api.themoviedb.org/3/" . $path . "?"
        . http_build_query($query);
    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "timeout" => 15,
            "ignore_errors" => true,
            "follow_location" => 0,
            "header" => "Accept: application/json\r\n"
        ]
    ]);

    $requestWarning = "";
    set_error_handler(static function (
        int $severity,
        string $message,
        string $file,
        int $line
    ) use (&$requestWarning): bool {
        $requestWarning = $message;
        return true;
    });

    try {
        $response = file_get_contents($url, false, $context);
    } finally {
        restore_error_handler();
    }

    if ($response === false) {
        $requestWarning = preg_replace(
            '/file_get_contents\([^)]*\)/i',
            "file_get_contents(TMDB endpoint)",
            $requestWarning
        );
        error_log("TMDB request could not connect: " . $requestWarning);
        throw new RuntimeException("Unable to reach TMDB.");
    }

    $statusLine = $http_response_header[0] ?? "";
    if (!preg_match('/\s(\d{3})\s/', $statusLine, $statusMatch)) {
        error_log("TMDB request did not return an HTTP status.");
        throw new RuntimeException("TMDB returned an invalid response.");
    }

    $status = (int) $statusMatch[1];
    if ($status < 200 || $status >= 300) {
        error_log("TMDB request returned HTTP status " . $status);
        if ($status === 401) {
            throw new RuntimeException("TMDB rejected the API key.", 503);
        }
        if ($status === 429) {
            throw new RuntimeException("TMDB rate limit reached. Try again shortly.", 503);
        }
        throw new RuntimeException("TMDB could not complete the request.", 502);
    }

    try {
        $data = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        error_log("TMDB returned invalid JSON: " . $error->getMessage());
        throw new RuntimeException("TMDB returned an invalid response.", 502);
    }

    if (!is_array($data)) {
        throw new RuntimeException("TMDB returned an invalid response.", 502);
    }

    return $data;
}

function tmdb_admin_image_url($path, string $size): string
{
    if (
        !is_string($path)
        || !preg_match('#^/[A-Za-z0-9._/-]+$#', $path)
        || str_contains($path, "..")
        || !in_array($size, ["w185", "w500", "w1280"], true)
    ) {
        return "";
    }

    return "https://image.tmdb.org/t/p/" . $size . $path;
}
