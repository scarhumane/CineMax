<?php

require_once __DIR__ . "/functions.php";

start_session();

if (current_user_is_admin()) {
    header("Location: ../06 - Admin/admin_movies.php");
    exit;
}

if (
    !isset($_SESSION["logged_in"]) ||
    $_SESSION["logged_in"] !== true
) {
    header("Location: ../02 - Login Page/login_page.html");
    exit;
}

render_page("movies.html");

?>
