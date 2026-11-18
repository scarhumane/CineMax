<?php

declare(strict_types=1);

const REVIEW_DIR = __DIR__ . "/reviews_data";
const MAX_REVIEWS_PER_TITLE = 500;
const MAX_NAME = 40;
const MAX_TEXT = 1500;
const MIN_TEXT = 3;
const COOKIE_NAME = "cm_reviewer";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");

/*
 * If CineMax has logged-in users, return the signed-in display name here
 * (for example from $_SESSION) and it will be used instead of the typed name.
 */
function currentUserName(): ?string
{
    return null;
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function isHttps(): bool
{
    return (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
        || ($_SERVER["SERVER_PORT"] ?? "") === "443";
}

function reviewerToken(): string
{
    $cookie = $_COOKIE[COOKIE_NAME] ?? "";

    return is_string($cookie) && preg_match('/^[a-f0-9]{32}$/', $cookie)
        ? $cookie
        : "";
}

function issueToken(): string
{
    $token = bin2hex(random_bytes(16));

    setcookie(COOKIE_NAME, $token, [
        "expires" => time() + 60 * 60 * 24 * 365,
        "path" => "/",
        "secure" => isHttps(),
        "httponly" => true,
        "samesite" => "Lax",
    ]);

    $_COOKIE[COOKIE_NAME] = $token;

    return $token;
}

function ensureStorage(): void
{
    if (!is_dir(REVIEW_DIR) && !@mkdir(REVIEW_DIR, 0755, true) && !is_dir(REVIEW_DIR)) {
        error_log("reviews.php: cannot create " . REVIEW_DIR);
        respond(["error" => "Reviews storage is unavailable."], 500);
    }

    $htaccess = REVIEW_DIR . "/.htaccess";

    if (!is_file($htaccess)) {
        @file_put_contents(
            $htaccess,
            "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n"
            . "<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n"
        );
    }
}

function parseTitle(mixed $kind, mixed $id): array
{
    $kind = is_string($kind) ? $kind : "movie";
    $id = filter_var($id, FILTER_VALIDATE_INT);

    if (!in_array($kind, ["movie", "tv"], true) || $id === false || $id < 1 || $id > 99999999) {
        respond(["error" => "A valid movie ID is required."], 400);
    }

    return [$kind, $id];
}

function storePath(string $kind, int $id): string
{
    return REVIEW_DIR . "/{$kind}_{$id}.json";
}

function decodeList(string|false $raw): array
{
    $list = json_decode($raw === false || $raw === "" ? "[]" : $raw, true);

    return is_array($list) ? $list : [];
}

function readReviews(string $path): array
{
    return is_file($path) ? decodeList(@file_get_contents($path)) : [];
}

function mutateReviews(string $path, callable $change): array
{
    $handle = @fopen($path, "c+");

    if ($handle === false) {
        respond(["error" => "Unable to save your review."], 500);
    }

    try {
        flock($handle, LOCK_EX);
        $list = $change(decodeList(stream_get_contents($handle)));
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($list, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        fflush($handle);
        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }

    return $list;
}

function publicView(array $list, string $token): array
{
    usort($list, static fn($a, $b) => strcmp((string)($b["created"] ?? ""), (string)($a["created"] ?? "")));

    $hash = $token === "" ? null : hash("sha256", $token);
    $out = [];
    $sum = 0;

    foreach ($list as $r) {
        $rating = (int)($r["rating"] ?? 0);
        $sum += $rating;
        $out[] = [
            "id" => (string)($r["id"] ?? ""),
            "name" => (string)($r["name"] ?? "Anonymous"),
            "rating" => $rating,
            "text" => (string)($r["text"] ?? ""),
            "created" => (string)($r["created"] ?? ""),
            "mine" => $hash !== null && ($r["reviewer"] ?? null) === $hash,
        ];
    }

    return [
        "reviews" => $out,
        "count" => count($out),
        "average" => count($out) ? round($sum / count($out), 1) : 0,
    ];
}

function cleanText(string $value, bool $multiline): string
{
    if (!mb_check_encoding($value, "UTF-8")) {
        return "";
    }

    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[^\P{C}\n]+/u', "", $value) ?? "";

    if ($multiline) {
        $value = preg_replace("/\n{3,}/", "\n\n", $value) ?? $value;
    } else {
        $value = preg_replace('/\s+/u', " ", $value) ?? $value;
    }

    return trim($value);
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET") {
    [$kind, $id] = parseTitle($_GET["kind"] ?? "movie", $_GET["movie_id"] ?? "");
    respond(publicView(readReviews(storePath($kind, $id)), reviewerToken()));
}

if ($method !== "POST") {
    header("Allow: GET, POST");
    respond(["error" => "Method not allowed."], 405);
}

/* ----- POST ----- */

$origin = $_SERVER["HTTP_ORIGIN"] ?? "";

if ($origin !== "") {
    $originHost = strtolower((string)parse_url($origin, PHP_URL_HOST));
    $selfHost = strtolower((string)parse_url("//" . ($_SERVER["HTTP_HOST"] ?? ""), PHP_URL_HOST));

    if ($originHost === "" || $originHost !== $selfHost) {
        respond(["error" => "Cross-origin requests are not allowed."], 403);
    }
}

if (stripos((string)($_SERVER["CONTENT_TYPE"] ?? ""), "application/json") !== 0) {
    respond(["error" => "Content-Type must be application/json."], 415);
}

$input = json_decode((string)file_get_contents("php://input", false, null, 0, 20000), true);

if (!is_array($input)) {
    respond(["error" => "Invalid request."], 400);
}

[$kind, $id] = parseTitle($input["kind"] ?? "movie", $input["movie_id"] ?? "");

$rating = filter_var($input["rating"] ?? null, FILTER_VALIDATE_INT);

if ($rating === false || $rating < 1 || $rating > 5) {
    respond(["error" => "Please choose a rating from 1 to 5 stars."], 400);
}

$name = cleanText(currentUserName() ?? (is_string($input["name"] ?? null) ? $input["name"] : ""), false);

if ($name === "" || mb_strlen($name) > MAX_NAME) {
    respond(["error" => "Please enter a display name (up to " . MAX_NAME . " characters)."], 400);
}

$text = cleanText(is_string($input["text"] ?? null) ? $input["text"] : "", true);

if (mb_strlen($text) < MIN_TEXT || mb_strlen($text) > MAX_TEXT) {
    respond(["error" => "Reviews must be " . MIN_TEXT . " to " . MAX_TEXT . " characters."], 400);
}

ensureStorage();

$token = reviewerToken() ?: issueToken();
$hash = hash("sha256", $token);

$list = mutateReviews(
    storePath($kind, $id),
    static function (array $list) use ($hash, $name, $rating, $text): array {
        $now = gmdate("c");
        $replaced = false;

        foreach ($list as &$r) {
            if (($r["reviewer"] ?? null) === $hash) {
                $r["name"] = $name;
                $r["rating"] = $rating;
                $r["text"] = $text;
                $r["created"] = $now;
                $replaced = true;
                break;
            }
        }
        unset($r);

        if (!$replaced) {
            $list[] = [
                "id" => bin2hex(random_bytes(6)),
                "reviewer" => $hash,
                "name" => $name,
                "rating" => $rating,
                "text" => $text,
                "created" => $now,
            ];
        }

        if (count($list) > MAX_REVIEWS_PER_TITLE) {
            $list = array_slice($list, -MAX_REVIEWS_PER_TITLE);
        }

        return $list;
    }
);

respond(publicView($list, $token), 201);