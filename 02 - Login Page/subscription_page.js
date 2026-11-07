// MONTHLY / YEARLY BILLING TOGGLE

const billingButtons = document.querySelectorAll(".billing-button");

const prices = document.querySelectorAll(".price-amount");
const periods = document.querySelectorAll(".price-period");

billingButtons.forEach(button => {

    button.addEventListener("click", () => {

        const selectedBilling = button.dataset.billing;

        // Update active button
        billingButtons.forEach(btn => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");

        // Update prices
        prices.forEach(price => {

            price.textContent =
                price.dataset[selectedBilling];

        });

        // Update billing periods
        periods.forEach((period, index) => {

            if (index === 0) {
                period.textContent = "/ forever";
            } else {
                period.textContent =
                    selectedBilling === "monthly"
                        ? "/ month"
                        : "/ year";
            }

        });

    });

});


// SELECT PLAN BUTTONS

const planButtons = document.querySelectorAll(".select-plan-button");
const planMessage = document.getElementById("plan-message");

planButtons.forEach(button => {

    button.addEventListener("click", () => {

        const selectedPlan = button.dataset.plan;

        planMessage.textContent =
            `You've selected ${selectedPlan}! Subscription checkout is for demonstration only.`;

    });

});


// LOAD LUCIDE ICONS
if (typeof lucide !== "undefined") {
    lucide.createIcons();
}