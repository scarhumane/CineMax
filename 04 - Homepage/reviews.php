<?php

session_start();

header("Content-Type: application/json; charset=UTF-8");

if (
    !isset($_SESSION["logged_in"]) ||
    $_SESSION["logged_in"] !== true
) {
    http_response_code(401);
    echo json_encode(["error" => "Please log in to access reviews."]);
    exit;
}

$username = $_SESSION["username"] ?? "";

if ($username === "") {
    http_response_code(401);
    echo json_encode(["error" => "Your account could not be identified."]);
    exit;
}

$file = __DIR__ . "/../03 - Data/reviews.json";

function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function readReviews($handle): array
{
    rewind($handle);

    $contents = stream_get_contents($handle);
    $data = json_decode($contents ?: '{"reviews":[]}', true);

    return is_array($data) && isset($data["reviews"]) && is_array($data["reviews"])
        ? $data["reviews"]
        : [];
}

function getReviewFile(string $file)
{
    $directory = dirname($file);

    if (!is_dir($directory)) {
        return false;
    }

    if (!file_exists($file)) {
        file_put_contents($file, '{"reviews":[]}', LOCK_EX);
    }

    return fopen($file, "c+");
}

function sendReviews(array $reviews, int $movieId, string $username): void
{
    $movieReviews = array_values(array_filter(
        $reviews,
        fn($review) =>
            (int)($review["movie_id"] ?? 0) === $movieId
    ));

    usort(
        $movieReviews,
        fn($a, $b) =>
            strcmp($b["updated_at"] ?? "", $a["updated_at"] ?? "")
    );

    $ownReview = null;

    foreach ($movieReviews as $review) {
        if (($review["username"] ?? "") === $username) {
            $ownReview = $review;
            break;
        }
    }

    respond([
        "success" => true,
        "reviews" => $movieReviews,
        "own_review" => $ownReview,
        "review_count" => count($movieReviews)
    ]);
}

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $movieId = filter_input(INPUT_GET, "movie_id", FILTER_VALIDATE_INT);

    if (!$movieId || $movieId <= 0) {
        respond(["error" => "A valid movie ID is required."], 400);
    }

    $handle = getReviewFile($file);

    if (!$handle) {
        respond(["error" => "Could not access the reviews file."], 500);
    }

    flock($handle, LOCK_SH);
    $reviews = readReviews($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    sendReviews($reviews, $movieId, $username);
}

if ($method === "POST" || $method === "DELETE") {
    $input = json_decode(file_get_contents("php://input"), true);

    if (!is_array($input)) {
        respond(["error" => "Invalid request data."], 400);
    }

    $movieId = filter_var(
        $input["movie_id"] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$movieId || $movieId <= 0) {
        respond(["error" => "A valid movie ID is required."], 400);
    }

    $handle = getReviewFile($file);

    if (!$handle) {
        respond(["error" => "Could not access the reviews file."], 500);
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        respond(["error" => "Could not lock the reviews file."], 500);
    }

    $reviews = readReviews($handle);

    if ($method === "POST") {
        $rating = filter_var(
            $input["rating"] ?? null,
            FILTER_VALIDATE_FLOAT
        );

        $title = trim($input["title"] ?? "");
        $content = trim($input["review"] ?? "");

        if (
            $rating === false ||
            $rating < 0.5 ||
            $rating > 5 ||
            fmod((float)$rating, 0.5) !== 0.0
        ) {
            flock($handle, LOCK_UN);
            fclose($handle);
            respond(["error" => "Choose a rating from 0.5 to 5 stars."], 400);
        }

        if (mb_strlen($title) < 3 || mb_strlen($title) > 80) {
            flock($handle, LOCK_UN);
            fclose($handle);
            respond(["error" => "The review title must be 3–80 characters."], 400);
        }

        if (mb_strlen($content) < 10 || mb_strlen($content) > 2000) {
            flock($handle, LOCK_UN);
            fclose($handle);
            respond(["error" => "Your review must be 10–2,000 characters."], 400);
        }

        $existingIndex = null;

        foreach ($reviews as $index => $review) {
            if (
                (int)($review["movie_id"] ?? 0) === $movieId &&
                ($review["username"] ?? "") === $username
            ) {
                $existingIndex = $index;
                break;
            }
        }

        $now = date("c");

        if ($existingIndex !== null) {
            $reviews[$existingIndex]["rating"] = (float)$rating;
            $reviews[$existingIndex]["title"] = $title;
            $reviews[$existingIndex]["review"] = $content;
            $reviews[$existingIndex]["updated_at"] = $now;
        } else {
            $reviews[] = [
                "id" => bin2hex(random_bytes(16)),
                "movie_id" => $movieId,
                "username" => $username,
                "rating" => (float)$rating,
                "title" => $title,
                "review" => $content,
                "created_at" => $now,
                "updated_at" => $now
            ];
        }
    }

    if ($method === "DELETE") {
        $reviewId = $input["review_id"] ?? "";

        if (!is_string($reviewId) || $reviewId === "") {
            flock($handle, LOCK_UN);
            fclose($handle);
            respond(["error" => "A review ID is required."], 400);
        }

        $found = false;

        foreach ($reviews as $index => $review) {
            if (
                ($review["id"] ?? "") === $reviewId &&
                (int)($review["movie_id"] ?? 0) === $movieId &&
                ($review["username"] ?? "") === $username
            ) {
                unset($reviews[$index]);
                $found = true;
                break;
            }
        }

        if (!$found) {
            flock($handle, LOCK_UN);
            fclose($handle);
            respond(["error" => "Review not found or you do not own it."], 404);
        }

        $reviews = array_values($reviews);
    }

    $output = json_encode(
        ["reviews" => $reviews],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
    );

    rewind($handle);
    ftruncate($handle, 0);

    $written = fwrite($handle, $output);
    fflush($handle);

    flock($handle, LOCK_UN);
    fclose($handle);

    if ($written === false) {
        respond(["error" => "Could not save your review."], 500);
    }

    sendReviews($reviews, $movieId, $username);
}

header("Allow: GET, POST, DELETE");
respond(["error" => "Method not allowed."], 405);