<?php

require_once __DIR__ . "/../04 - Homepage/functions.php";

start_session();

if (($_SESSION["logged_in"] ?? false) !== true) {
    header("Location: ../02 - Login Page/login_page.html");
    exit;
}

if (!current_user_is_admin()) {
    http_response_code(403);
    exit("Administrator access is required.");
}

render_page("admin_movies.html");

?>
