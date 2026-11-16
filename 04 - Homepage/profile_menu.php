
<?php

function render_profile_menu(): string
{
    $name = current_user_name();
    $initial = first_letter($name);
    $plan = current_user_plan();

    ob_start();
    ?>

    <div class="profile-menu">

        <button
            class="profile-trigger"
            id="profile-trigger"
            type="button"
            aria-expanded="false"
            aria-controls="profile-dropdown"
        >

            <span class="profile-avatar">
                <?= e($initial) ?>
            </span>

            <span class="profile-name">
                <?= e($name) ?>
            </span>

            <i data-lucide="chevron-down"></i>

        </button>

        <div
            class="profile-dropdown"
            id="profile-dropdown"
            hidden
        >

            <div class="profile-dropdown-header">

                <span class="profile-avatar">
                    <?= e($initial) ?>
                </span>

                <div>
                    <strong><?= e($name) ?></strong>
                    <span><?= e($plan) ?></span>
                </div>

            </div>

            <div class="profile-dropdown-divider"></div>

            <a href="#" class="profile-dropdown-item">
                <i data-lucide="user-round"></i>
                <span>Account</span>
            </a>

            <a href="#" class="profile-dropdown-item">
                <i data-lucide="settings"></i>
                <span>Profile Settings</span>
            </a>

            <div class="profile-dropdown-divider"></div>

            <a
                href="../05 - logout Page/logout.php"
                class="profile-dropdown-item logout-item"
            >
                <i data-lucide="log-out"></i>
                <span>Log Out</span>
            </a>

        </div>

    </div>

    <?php

    return (string) ob_get_clean();
}
