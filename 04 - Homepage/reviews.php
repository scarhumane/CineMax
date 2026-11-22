<?php

declare(strict_types=1);

require_once __DIR__ . "/functions.php";

start_session();

const REVIEW_DIR = __DIR__ . "/reviews.json";
const MAX_REVIEWS_PER_TITLE = 500;
const MAX_TEXT = 1500;
const MIN_TEXT = 3;

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");

function respond(array $payload, int $status = 200): never
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

function requireReviewAccount(): array
{
    if (($_SESSION["logged_in"] ?? false) !== true) {
        respond(["error" => "Please sign in to access CineMax reviews."], 401);
    }

    $username = $_SESSION["username"] ?? null;

    if (!is_string($username) || trim($username) === "") {
        respond(["error" => "Your account session is incomplete. Please sign in again."], 401);
    }

    $userKey = hash("sha256", strtolower(trim($username)));
    $displayName = current_user_name();

    return [$userKey, $displayName];
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
        respond(["error" => "A valid movie or TV ID is required."], 400);
    }

    return [$kind, $id];
}

function storePath(string $kind, int $id): string
{
    return REVIEW_DIR . "/{$kind}_{$id}.json";
}

function decodeList(string|false $raw): array
{
    if ($raw === false || trim($raw) === "") {
        return [];
    }

    $list = json_decode($raw, true);
    return is_array($list) ? $list : [];
}

function readReviews(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $handle = @fopen($path, "rb");
    if ($handle === false) {
        respond(["error" => "Unable to read reviews."], 500);
    }

    try {
        if (!flock($handle, LOCK_SH)) {
            respond(["error" => "Unable to read reviews."], 500);
        }
        $list = decodeList(stream_get_contents($handle));
        flock($handle, LOCK_UN);
        return $list;
    } finally {
        fclose($handle);
    }
}

function mutateReviews(string $path, callable $change): array
{
    $handle = @fopen($path, "c+");

    if ($handle === false) {
        respond(["error" => "Unable to save your review."], 500);
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            respond(["error" => "Unable to save your review."], 500);
        }

        rewind($handle);
        $list = $change(decodeList(stream_get_contents($handle)));
        $json = json_encode(
            $list,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );

        if ($json === false || !ftruncate($handle, 0)) {
            respond(["error" => "Unable to save your review."], 500);
        }

        rewind($handle);
        if (fwrite($handle, $json) === false) {
            respond(["error" => "Unable to save your review."], 500);
        }

        fflush($handle);
        flock($handle, LOCK_UN);
        return $list;
    } finally {
        fclose($handle);
    }
}

function publicView(array $list, string $userKey, string $csrfToken): array
{
    $list = array_values(array_filter($list, static fn($review) =>
        is_array($review) && isset($review["user_key"], $review["id"])
    ));

    usort($list, static fn($a, $b) =>
        strcmp((string)($b["created"] ?? ""), (string)($a["created"] ?? ""))
    );

    $out = [];
    $sum = 0;
    $ownReview = null;

    foreach ($list as $review) {
        $rating = (int)($review["rating"] ?? 0);
        $sum += $rating;

        $item = [
            "id" => (string)$review["id"],
            "name" => (string)($review["name"] ?? "CineMax member"),
            "rating" => $rating,
            "text" => (string)($review["text"] ?? ""),
            "created" => (string)($review["created"] ?? ""),
            "mine" => hash_equals($userKey, (string)$review["user_key"]),
        ];

        if ($item["mine"]) {
            $ownReview = $item;
        }

        $out[] = $item;
    }

    return [
        "reviews" => $out,
        "own_review" => $ownReview,
        "count" => count($out),
        "average" => count($out) ? round($sum / count($out), 1) : 0,
        "csrf_token" => $csrfToken,
    ];
}

function cleanReviewText(string $value): string
{
    if (!mb_check_encoding($value, "UTF-8")) {
        return "";
    }

    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[^\P{C}\n]+/u', "", $value) ?? "";
    $value = preg_replace("/\n{3,}/", "\n\n", $value) ?? $value;

    return trim($value);
}

function csrfToken(): string
{
    if (!isset($_SESSION["reviews_csrf_token"]) || !is_string($_SESSION["reviews_csrf_token"])) {
        $_SESSION["reviews_csrf_token"] = bin2hex(random_bytes(32));
    }

    return $_SESSION["reviews_csrf_token"];
}

function verifyWriteRequest(): void
{
    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";

    if ($origin !== "") {
        $originHost = strtolower((string)parse_url($origin, PHP_URL_HOST));
        $selfHost = strtolower((string)parse_url("//" . ($_SERVER["HTTP_HOST"] ?? ""), PHP_URL_HOST));

        if ($originHost === "" || $originHost !== $selfHost) {
            respond(["error" => "Cross-origin requests are not allowed."], 403);
        }
    }

    $provided = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
    $expected = csrfToken();

    if (!is_string($provided) || !hash_equals($expected, $provided)) {
        respond(["error" => "Your session security token expired. Refresh the page and try again."], 403);
    }

    if (stripos((string)($_SERVER["CONTENT_TYPE"] ?? ""), "application/json") !== 0) {
        respond(["error" => "Content-Type must be application/json."], 415);
    }
}

function readJsonBody(): array
{
    $raw = file_get_contents("php://input", false, null, 0, 20000);
    $input = json_decode($raw === false ? "" : $raw, true);

    if (!is_array($input)) {
        respond(["error" => "Invalid request."], 400);
    }

    return $input;
}

[$userKey, $displayName] = requireReviewAccount();
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET") {
    [$kind, $id] = parseTitle($_GET["kind"] ?? "movie", $_GET["movie_id"] ?? "");
    ensureStorage();
    respond(publicView(readReviews(storePath($kind, $id)), $userKey, csrfToken()));
}

if (!in_array($method, ["POST", "DELETE"], true)) {
    header("Allow: GET, POST, DELETE");
    respond(["error" => "Method not allowed."], 405);
}

verifyWriteRequest();
$input = readJsonBody();
[$kind, $id] = parseTitle($input["kind"] ?? "movie", $input["movie_id"] ?? "");
ensureStorage();
$path = storePath($kind, $id);

if ($method === "POST") {
    $rating = filter_var($input["rating"] ?? null, FILTER_VALIDATE_INT);

    if ($rating === false || $rating < 1 || $rating > 5) {
        respond(["error" => "Please choose a rating from 1 to 5 stars."], 400);
    }

    $text = cleanReviewText(is_string($input["text"] ?? null) ? $input["text"] : "");
    $length = mb_strlen($text);

    if ($length < MIN_TEXT || $length > MAX_TEXT) {
        respond(["error" => "Reviews must be " . MIN_TEXT . " to " . MAX_TEXT . " characters."], 400);
    }

    $list = mutateReviews(
        $path,
        static function (array $list) use ($userKey, $displayName, $rating, $text): array {
            $now = gmdate("c");
            $found = false;

            foreach ($list as &$review) {
                if (($review["user_key"] ?? null) === $userKey) {
                    $review["name"] = $displayName;
                    $review["rating"] = $rating;
                    $review["text"] = $text;
                    $review["created"] = $now;
                    $found = true;
                    break;
                }
            }
            unset($review);

            if (!$found) {
                $list[] = [
                    "id" => bin2hex(random_bytes(8)),
                    "user_key" => $userKey,
                    "name" => $displayName,
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

    respond(publicView($list, $userKey, csrfToken()));
}

$reviewId = $input["review_id"] ?? "";
if (!is_string($reviewId) || !preg_match('/^[a-f0-9]{16}$/', $reviewId)) {
    respond(["error" => "A valid review ID is required."], 400);
}

$list = mutateReviews(
    $path,
    static function (array $list) use ($userKey, $reviewId): array {
        $found = false;
        $updated = [];

        foreach ($list as $review) {
            if (($review["id"] ?? null) === $reviewId && ($review["user_key"] ?? null) === $userKey) {
                $found = true;
                continue;
            }
            $updated[] = $review;
        }

        if (!$found) {
            respond(["error" => "Review not found or you do not have permission to delete it."], 404);
        }

        return $updated;
    }
);

respond(publicView($list, $userKey, csrfToken()));
