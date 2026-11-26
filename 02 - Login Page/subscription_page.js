document.addEventListener("DOMContentLoaded", () => {

    console.log("CineMax subscription JavaScript loaded.");

    // MONTHLY / YEARLY BILLING TOGGLE

    const billingButtons = document.querySelectorAll(".billing-button");
    const prices = document.querySelectorAll(".price-amount");
    const planCards = document.querySelectorAll(".plan-card");

    billingButtons.forEach(button => {

        button.addEventListener("click", () => {

            const selectedBilling = button.dataset.billing;

            // Update active billing button
            billingButtons.forEach(btn => {
                btn.classList.remove("active");
                btn.setAttribute("aria-pressed", "false");
            });

            button.classList.add("active");
            button.setAttribute("aria-pressed", "true");

            // Update displayed prices
            prices.forEach(price => {
                price.textContent = price.dataset[selectedBilling];
            });

            // Update billing periods
            planCards.forEach(card => {

                const pricePeriod = card.querySelector(".price-period");

                if (!pricePeriod) return;

                const isFreePlan = card.querySelector(
                    '[data-plan="CineMax Basic"]'
                );

                pricePeriod.textContent = isFreePlan
                    ? "/ forever"
                    : selectedBilling === "monthly"
                        ? "/ month"
                        : "/ year";

            });

        });

    });


    // SUBSCRIPTION PLAN SELECTION

    const planButtons = document.querySelectorAll(".select-plan-button");
    const planMessage = document.getElementById("plan-message");

    console.log("Plan buttons found:", planButtons.length);

    const allowedPlans = [
        "CineMax Basic",
        "CineMax Plus",
        "CineMax Ultimate"
    ];

    planButtons.forEach(button => {

        button.addEventListener("click", () => {

            console.log("Plan button clicked:", button.dataset.plan);

            const selectedPlan = button.dataset.plan;

            // Get currently selected billing period
            const activeBillingButton = document.querySelector(
                ".billing-button.active"
            );

            const selectedBilling = activeBillingButton
                ? activeBillingButton.dataset.billing
                : "monthly";

            // Validate selected plan
            if (!allowedPlans.includes(selectedPlan)) {

                if (planMessage) {
                    planMessage.textContent = "Invalid subscription plan.";
                }

                return;
            }

            // Validate billing period
            if (!["monthly", "yearly"].includes(selectedBilling)) {

                if (planMessage) {
                    planMessage.textContent = "Invalid billing period.";
                }

                return;
            }

            // Prevent repeated submissions
            planButtons.forEach(btn => {
                btn.disabled = true;
            });

            const originalText = button.textContent;

            button.dataset.originalText = originalText;
            button.textContent = "Processing...";

            if (planMessage) {
                planMessage.textContent = "Redirecting to checkout...";
            }

            // CREATE POST FORM

            const form = document.createElement("form");

            form.method = "POST";
            // Relative path: works from any folder or server, not only /CineMax/
            form.action = "select_plan.php";

            // Selected plan
            const planInput = document.createElement("input");

            planInput.type = "hidden";
            planInput.name = "plan";
            planInput.value = selectedPlan;

            // Selected billing period
            const billingInput = document.createElement("input");

            billingInput.type = "hidden";
            billingInput.name = "billing_period";
            billingInput.value = selectedBilling;

            // Append inputs
            form.appendChild(planInput);
            form.appendChild(billingInput);

            document.body.appendChild(form);

            console.log("Submitting plan:", selectedPlan);
            console.log("Billing period:", selectedBilling);
            console.log("Destination:", form.action);

            // Submit form
            form.submit();

        });

    });

    // If the user comes back with the browser Back button, the page can be
    // restored from cache with every button still disabled. Reset them.
    window.addEventListener("pageshow", (event) => {
        if (!event.persisted) return;

        planButtons.forEach(btn => {
            btn.disabled = false;

            if (btn.dataset.originalText) {
                btn.textContent = btn.dataset.originalText;
            }
        });

        if (planMessage) {
            planMessage.textContent = "";
        }
    });

    // LUCIDE ICONS

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

});