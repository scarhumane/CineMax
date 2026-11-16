<?php
require_once __DIR__ . "/functions.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

start_session();

function watchlist_send_json(array $payload, int $status = 200): void
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

function watchlist_clean_text($value, int $maxLength = 2000): string
{
    if (!is_string($value) && !is_numeric($value)) {
        return "";
    }

    $value = trim((string) $value);

    if (function_exists("mb_substr")) {
        return mb_substr($value, 0, $maxLength, "UTF-8");
    }

    if (function_exists("iconv_substr")) {
        $limited = iconv_substr($value, 0, $maxLength, "UTF-8");
        return $limited === false ? "" : $limited;
    }

    return substr($value, 0, $maxLength);
}

function watchlist_clean_image($value): string
{
    $url = watchlist_clean_text($value, 500);

    if ($url === "") {
        return "";
    }

    $parts = parse_url($url);

    if (
        !is_array($parts)
        || ($parts["scheme"] ?? "") !== "https"
        || ($parts["host"] ?? "") !== "image.tmdb.org"
        || !str_starts_with($parts["path"] ?? "", "/t/p/")
    ) {
        return "";
    }

    return $url;
}

function watchlist_clean_string_list($value, int $limit, int $length): array
{
    if (!is_array($value)) {
        return [];
    }

    $clean = [];

    foreach (array_slice($value, 0, $limit) as $item) {
        $item = watchlist_clean_text($item, $length);
        if ($item !== "") {
            $clean[] = $item;
        }
    }

    return array_values(array_unique($clean));
}

function watchlist_clean_movie($movie): ?array
{
    if (!is_array($movie)) {
        return null;
    }

    $id = filter_var($movie["id"] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id <= 0) {
        return null;
    }

    $title = watchlist_clean_text($movie["title"] ?? "", 200);
    if ($title === "") {
        return null;
    }

    $year = watchlist_clean_text($movie["year"] ?? "N/A", 10);
    $rating = is_numeric($movie["rating"] ?? null)
        ? max(0, min(10, (float) $movie["rating"]))
        : 0;

    return [
        "id" => (string) $id,
        "title" => $title,
        "year" => $year,
        "rating" => $rating,
        "genres" => watchlist_clean_string_list($movie["genres"] ?? [], 10, 50),
        "director" => watchlist_clean_text($movie["director"] ?? "", 150),
        "cast" => watchlist_clean_string_list($movie["cast"] ?? [], 10, 150),
        "poster" => watchlist_clean_image($movie["poster"] ?? ""),
        "backdrop" => watchlist_clean_image($movie["backdrop"] ?? ""),
        "backdropSmall" => watchlist_clean_image($movie["backdropSmall"] ?? ""),
        "description" => watchlist_clean_text($movie["description"] ?? "", 3000)
    ];
}

function watchlist_open_data_file(string $path)
{
    $directory = dirname($path);

    if (!is_dir($directory) || !is_writable($directory)) {
        watchlist_send_json(["error" => "The watchlist data folder is not writable."], 500);
    }

    $handle = fopen($path, "c+");
    if ($handle === false) {
        watchlist_send_json(["error" => "Unable to open the watchlist data file."], 500);
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        watchlist_send_json(["error" => "Unable to access the watchlist data file."], 500);
    }

    $contents = stream_get_contents($handle);
    $data = json_decode($contents ?: "{}", true);

    if (!is_array($data)) {
        $data = [];
    }

    return [$handle, $data];
}

function watchlist_save_and_close($handle, array $data): void
{
    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT
            | JSON_UNESCAPED_SLASHES
            | JSON_UNESCAPED_UNICODE
            | JSON_INVALID_UTF8_SUBSTITUTE
    );

    if ($json === false) {
        flock($handle, LOCK_UN);
        fclose($handle);
        watchlist_send_json(["error" => "Unable to encode the watchlist data."], 500);
    }

    rewind($handle);
    ftruncate($handle, 0);

    if (fwrite($handle, $json) === false) {
        flock($handle, LOCK_UN);
        fclose($handle);
        watchlist_send_json(["error" => "Unable to save the watchlist data."], 500);
    }

    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}

if (($_SESSION["logged_in"] ?? false) !== true) {
    watchlist_send_json(["error" => "Please log in to access your watchlist."], 401);
}

$username = $_SESSION["username"] ?? "";
if (!is_string($username) || trim($username) === "") {
    watchlist_send_json(["error" => "Your account session is missing a username."], 401);
}

$username = trim($username);
$dataFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . "03 - Data" . DIRECTORY_SEPARATOR . "watchlists.json";
[$handle, $watchlists] = watchlist_open_data_file($dataFile);

if (!isset($watchlists[$username]) || !is_array($watchlists[$username])) {
    $watchlists[$username] = [];
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET") {
    $watchlist = array_values($watchlists[$username]);
    flock($handle, LOCK_UN);
    fclose($handle);
    watchlist_send_json(["success" => true, "watchlist" => $watchlist]);
}

if ($method !== "POST") {
    flock($handle, LOCK_UN);
    fclose($handle);
    watchlist_send_json(["error" => "Unsupported request method."], 405);
}

$input = json_decode(file_get_contents("php://input"), true);
if (!is_array($input)) {
    flock($handle, LOCK_UN);
    fclose($handle);
    watchlist_send_json(["error" => "Invalid request body."], 400);
}

$action = $input["action"] ?? "";
$current = array_values($watchlists[$username]);

if ($action === "add") {
    $movie = watchlist_clean_movie($input["movie"] ?? null);

    if ($movie === null) {
        flock($handle, LOCK_UN);
        fclose($handle);
        watchlist_send_json(["error" => "The movie information is invalid."], 400);
    }

    $exists = false;
    foreach ($current as $savedMovie) {
        if ((string) ($savedMovie["id"] ?? "") === $movie["id"]) {
            $exists = true;
            break;
        }
    }

    if (!$exists) {
        $current[] = $movie;
    }
} elseif ($action === "remove") {
    $id = filter_var($input["id"] ?? null, FILTER_VALIDATE_INT);

    if ($id === false || $id <= 0) {
        flock($handle, LOCK_UN);
        fclose($handle);
        watchlist_send_json(["error" => "A valid movie ID is required."], 400);
    }

    $current = array_values(array_filter(
        $current,
        static fn($movie) => (string) ($movie["id"] ?? "") !== (string) $id
    ));
} else {
    flock($handle, LOCK_UN);
    fclose($handle);
    watchlist_send_json(["error" => "Unsupported watchlist action."], 400);
}

$watchlists[$username] = $current;
watchlist_save_and_close($handle, $watchlists);
watchlist_send_json(["success" => true, "watchlist" => $current]);
