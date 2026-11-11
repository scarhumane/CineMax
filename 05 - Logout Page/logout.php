
<?php

session_start();


$_SESSION = [];

// Remove the session cookie
if (ini_get("session.use_cookies")) {

    $params = session_get_cookie_params();

    setcookie(
        session_name(),
        "",
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}


session_destroy();


header("Location: ../02 - Login Page/login_page.html?logout=success");
exit;

?>