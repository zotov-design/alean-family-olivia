const callbackForm = document.querySelector(".callback-form");
const callbackPhone = callbackForm.elements.phone;
const callbackStatus = callbackForm.querySelector(".callback-status");
const callbackMethod = callbackForm.querySelector('[aria-controls="callback-methods"]');
callbackMethod.addEventListener("click", () => openMenu(callbackMethod));
bindOptionMenu(document.querySelector("#callback-methods"), value => {
  callbackForm.elements.contact.value = value;
});

callbackPhone.addEventListener("input", () => callbackPhone.setCustomValidity(""));
callbackForm.addEventListener("submit", event => {
  event.preventDefault();
  const digits = callbackPhone.value.replace(/\D/g, "");
  callbackPhone.setCustomValidity(digits.length >= 10 && digits.length <= 15 ? "" : "Проверьте номер телефона");
  if (!callbackForm.reportValidity()) return;
  callbackStatus.hidden = false;
});
callbackForm.querySelector("[data-callback-submit]").type = "submit";
