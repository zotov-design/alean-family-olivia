const callbackForm = document.querySelector(".callback-form");
const callbackPhone = callbackForm.elements.phone;
const callbackStatus = callbackForm.querySelector(".callback-status");
callbackPhone.addEventListener("input", () => callbackPhone.setCustomValidity(""));
const errorMessage = callbackStatus.innerHTML;
const submitButton = callbackForm.querySelector("[data-callback-submit]");
callbackForm.addEventListener("submit", async event => {
  event.preventDefault();
  const digits = callbackPhone.value.replace(/\D/g, "");
  callbackPhone.setCustomValidity(digits.length >= 10 && digits.length <= 15 ? "" : "Проверьте номер телефона");
  if (!callbackForm.reportValidity()) return;
  if (submitButton.disabled) return;
  submitButton.disabled = true;
  callbackStatus.hidden = false;
  callbackStatus.textContent = "Отправляем заявку…";
  try {
    const response = await fetch(callbackForm.action, {method: "POST", body: new FormData(callbackForm)});
    if (!response.ok || !(await response.json()).ok) throw new Error();
    callbackStatus.textContent = "Заявка отправлена. Менеджер свяжется с вами.";
    window.trackOliviaGoal?.('callback_success');
  } catch {
    callbackStatus.innerHTML = errorMessage;
    submitButton.disabled = false;
  }
});
callbackForm.querySelector("[data-callback-submit]").type = "submit";
