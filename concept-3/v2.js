// V2: кнопка «Найти номер» передаёт выбор в заявку, sticky-кнопка, демо-отправка формы
document.addEventListener("DOMContentLoaded", () => {
  const search = document.querySelector(".search-rooms");
  const lead = document.querySelector("#lead");
  const summary = document.querySelector(".v2-summary");
  const hidden = document.querySelector('.v2-form [name="summary"]');
  const fieldText = i => {
    const f = document.querySelectorAll(".booking-fields .field")[i];
    return f && f.classList.contains("filled") ? f.querySelector(".field-value").textContent.trim() : "";
  };
  if (search) search.addEventListener("click", () => {
    const parts = ["Alean Family Olivia", fieldText(1), fieldText(2)].filter(Boolean);
    const promo = document.querySelector('.promo input').value.trim();
    if (promo) parts.push("промокод " + promo);
    const text = parts.join(", ");
    summary.textContent = "Ваш выбор: " + text;
    hidden.value = text;
    lead.scrollIntoView({behavior: "smooth", block: "start"});
    setTimeout(() => lead.querySelector("input").focus({preventScroll: true}), 900);
  });

  const form = document.querySelector(".v2-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    // ПРОТОТИП: здесь подключается CRM / модуль бронирования
    form.querySelector(".v2-form-ok").hidden = false;
    form.querySelector('button[type="submit"]').disabled = true;
  });

  const sticky = document.querySelector(".v2-sticky");
  const hero = document.querySelector(".hero-stage");
  const booking = document.querySelector("#booking");
  const onScroll = () => {
    const pastHero = hero.getBoundingClientRect().bottom < 0;
    const b = booking.getBoundingClientRect();
    const atBooking = b.top < innerHeight && b.bottom > 0;
    const l = lead.getBoundingClientRect();
    const atLead = l.top < innerHeight * .8;
    const show = pastHero && !atBooking && !atLead;
    sticky.classList.toggle("show", show);
    sticky.setAttribute("aria-hidden", String(!show));
  };
  addEventListener("scroll", onScroll, {passive: true});
  onScroll();
});
