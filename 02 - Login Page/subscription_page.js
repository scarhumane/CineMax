// MONTHLY / YEARLY BILLING TOGGLE

const billingButtons = document.querySelectorAll(".billing-button");

const prices = document.querySelectorAll(".price-amount");
const periods = document.querySelectorAll(".price-period");

billingButtons.forEach(button => {

    button.addEventListener("click", () => {

        const selectedBilling = button.dataset.billing;

        billingButtons.forEach(btn => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");

        prices.forEach(price => {

            price.textContent =
                price.dataset[selectedBilling];

        });

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




const planButtons = document.querySelectorAll(".select-plan-button");
const planMessage = document.getElementById("plan-message");

planButtons.forEach(button => {

    button.addEventListener("click", () => {

        const selectedPlan = button.dataset.plan;

       
        const activeBillingButton = document.querySelector(
            ".billing-button.active"
        );

        const selectedBilling = activeBillingButton
            ? activeBillingButton.dataset.billing
            : "monthly";

       
        planButtons.forEach(btn => {
            btn.disabled = true;
        });

        button.textContent = "Processing...";
        planMessage.textContent = "";

       
        const form = document.createElement("form");

        form.method = "POST";
        form.action = "select_plan.php";

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

       
        form.submit();

    });

});



if (typeof lucide !== "undefined") {
    lucide.createIcons();
}