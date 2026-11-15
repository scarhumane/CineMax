
document.addEventListener("DOMContentLoaded", () => {

    console.log("CineMax subscription JavaScript loaded.");

    // MONTHLY / YEARLY BILLING TOGGLE

    const billingButtons = document.querySelectorAll(".billing-button");
    const prices = document.querySelectorAll(".price-amount");
    const planCards = document.querySelectorAll(".plan-card");

    billingButtons.forEach(button => {

        button.addEventListener("click", () => {

            const selectedBilling = button.dataset.billing;

            billingButtons.forEach(btn => {
                btn.classList.remove("active");
                btn.setAttribute("aria-pressed", "false");
            });

            button.classList.add("active");
            button.setAttribute("aria-pressed", "true");

            // Update prices
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

            // Prevent repeated clicks
            planButtons.forEach(btn => {
                btn.disabled = true;
            });

            button.textContent = "Processing...";

            if (planMessage) {
                planMessage.textContent = "Redirecting to checkout...";
            }

            // Create POST form
            const form = document.createElement("form");

            form.method = "POST";

            // Explicit PHP destination
            form.action = "/CineMax/02%20-%20Login%20Page/select_plan.php";

            const planInput = document.createElement("input");
            planInput.type = "hidden";
            planInput.name = "plan";
            planInput.value = selectedPlan;

            const billingInput = document.createElement("input");
            billingInput.type = "hidden";
            billingInput.name = "billing_period";
            billingInput.value = selectedBilling;

            form.appendChild(planInput);
            form.appendChild(billingInput);

            document.body.appendChild(form);

            console.log("Submitting plan:", selectedPlan);
            console.log("Billing period:", selectedBilling);
            console.log("Destination:", form.action);

            form.submit();

        });

    });


    // LUCIDE ICONS

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

});
