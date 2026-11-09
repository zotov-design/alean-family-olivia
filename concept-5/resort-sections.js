const reduceResortMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const diningTrack = document.querySelector(".dining-track");
const diningCards = Array.from(diningTrack.children);
const firstDiningPosition = 2;
let diningPosition = firstDiningPosition;
let wrapTimer;

function repeatDiningCard(card) {
  const copy = card.cloneNode(true);
  copy.removeAttribute("data-wipe");
  copy.setAttribute("aria-hidden", "true");
  copy.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
  copy.querySelectorAll("button").forEach(button => {
    button.tabIndex = -1;
    button.removeAttribute("aria-controls");
  });
  return copy;
}

const previousDiningSlides = diningCards.slice(-firstDiningPosition).map(repeatDiningCard);
previousDiningSlides.forEach(card => card.classList.add("dining-before"));
diningTrack.classList.add("dining-initial");
diningTrack.prepend(...previousDiningSlides);
diningTrack.append(...diningCards.slice(0, 4).map(repeatDiningCard));
const diningSlides = Array.from(diningTrack.children);
const diningCardIndex = position =>
  (position - firstDiningPosition + diningCards.length) % diningCards.length;

function renderDiningPosition(position) {
  diningPosition = position;
  diningTrack.style.setProperty("--dining-index", position);
  const activeIndex = diningCardIndex(position);
  diningSlides.forEach((card, i) => {
    const selected = i === position;
    card.classList.toggle("dining-card-wide", selected);
    if (!card.hasAttribute("aria-hidden")) {
      card.querySelector(".dining-select").setAttribute("aria-current", String(diningCardIndex(i) === activeIndex));
    }
  });
}

function jumpDiningPosition(position) {
  diningTrack.classList.add("dining-jump");
  renderDiningPosition(position);
  // Commit the identical frame on the original cards before restoring transitions.
  diningTrack.getBoundingClientRect();
  diningTrack.classList.remove("dining-jump");
}

function finishDiningWrap() {
  if (wrapTimer === undefined) return;
  clearTimeout(wrapTimer);
  wrapTimer = undefined;
  const focusWasOnCard = diningSlides[diningPosition].contains(document.activeElement);
  const original = diningCardIndex(diningPosition);
  jumpDiningPosition(firstDiningPosition + original);
  if (focusWasOnCard) diningCards[original].querySelector(".dining-select").focus({preventScroll: true});
}

function selectDiningCard(position) {
  if (wrapTimer !== undefined || position === diningPosition) return;
  if (position < firstDiningPosition || position >= firstDiningPosition + diningCards.length) {
    diningTrack.classList.remove("dining-initial");
  }
  renderDiningPosition(position);
  if (position < firstDiningPosition || position >= firstDiningPosition + diningCards.length) {
    if (reduceResortMotion.matches) {
      jumpDiningPosition(firstDiningPosition + diningCardIndex(position));
    } else {
      wrapTimer = setTimeout(finishDiningWrap, 820);
    }
  }
}

diningTrack.addEventListener("transitionend", event => {
  if (event.target === diningTrack && event.propertyName === "transform") finishDiningWrap();
});

diningSlides.forEach((card, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dining-select";
  button.setAttribute("aria-label", "Выбрать карточку: " + card.querySelector("h3").textContent);
  if (card.hasAttribute("aria-hidden")) button.tabIndex = -1;
  button.addEventListener("click", () => selectDiningCard(index));
  card.prepend(button);
  card.addEventListener("focusin", event => {
    if (event.target.matches(":focus-visible")) selectDiningCard(index);
  });
});
jumpDiningPosition(firstDiningPosition);

const diningViewport = diningTrack.parentElement;
if (!reduceResortMotion.matches && "IntersectionObserver" in window) {
  diningViewport.classList.add("brush-pending");
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    diningViewport.classList.replace("brush-pending", "brush-drawn");
    observer.disconnect();
  }, {threshold: .2});
  observer.observe(diningViewport);
}

for (const button of document.querySelectorAll("[data-dining-step]")) {
  button.addEventListener("click", () => selectDiningCard(diningPosition + Number(button.dataset.diningStep)));
}

let swipeStart;
diningTrack.addEventListener("touchstart", event => {
  swipeStart = event.touches.length === 1 ? event.touches[0] : null;
}, {passive: true});
diningTrack.addEventListener("touchend", event => {
  if (!swipeStart) return;
  const touch = event.changedTouches[0];
  const horizontal = touch.clientX - swipeStart.clientX;
  const vertical = touch.clientY - swipeStart.clientY;
  if (Math.abs(horizontal) > 45 && Math.abs(horizontal) > Math.abs(vertical)) {
    selectDiningCard(diningPosition + (horizontal < 0 ? 1 : -1));
  }
  swipeStart = null;
}, {passive: true});

diningSlides.forEach((card, position) => {
  card.querySelector(".dining-toggle")?.addEventListener("click", () => {
    const isOpen = !card.classList.contains("is-open");
    diningSlides.forEach((slide, index) => {
      if (diningCardIndex(index) !== diningCardIndex(position)) return;
      slide.classList.toggle("is-open", isOpen);
      slide.querySelector(".dining-toggle").setAttribute("aria-expanded", String(isOpen));
      slide.querySelector(".dining-cover").setAttribute("aria-hidden", String(isOpen));
      slide.querySelector(".dining-info").setAttribute("aria-hidden", String(!isOpen));
    });
  });
});

const kidsTabs = document.querySelector(".kids-tabs");
const ageTabs = Array.from(kidsTabs.querySelectorAll('[role="tab"]'));

function moveAgeIndicator() {
  const tab = kidsTabs.querySelector('[aria-selected="true"]');
  kidsTabs.style.setProperty("--tab-x", tab.offsetLeft + "px");
  kidsTabs.style.setProperty("--tab-width", tab.offsetWidth + "px");
}

function selectAgeTab(tab) {
  if (tab.getAttribute("aria-selected") === "true") return;
  for (const item of ageTabs) {
    const isSelected = item === tab;
    item.setAttribute("aria-selected", String(isSelected));
    item.tabIndex = isSelected ? 0 : -1;
    document.getElementById(item.getAttribute("aria-controls")).hidden = !isSelected;
  }
  moveAgeIndicator();
  const panel = document.getElementById(tab.getAttribute("aria-controls"));
  window.ScrollTrigger?.refresh();
  if (window.gsap && !reduceResortMotion.matches) {
    const figure = panel.querySelector(".kids-photo");
    gsap.timeline()
      .fromTo(figure, {clipPath: "inset(0 0 100% 0)"}, {clipPath: "inset(0)", duration: .75, ease: "power2.inOut", clearProps: "clipPath"})
      .fromTo(figure.firstElementChild, {scale: 1.3}, {scale: 1, duration: .75, ease: "power2.inOut", clearProps: "transform"}, 0)
      .fromTo(panel.querySelector(".kids-age"), {opacity: 0, y: 12}, {opacity: 1, y: 0, duration: .45, clearProps: "opacity,transform"}, 0);
  }
}

ageTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectAgeTab(tab));
  tab.addEventListener("keydown", event => {
    const targetIndex = {
      ArrowLeft: (index + ageTabs.length - 1) % ageTabs.length,
      ArrowRight: (index + 1) % ageTabs.length,
      Home: 0,
      End: ageTabs.length - 1
    }[event.key];
    if (targetIndex === undefined) return;
    event.preventDefault();
    ageTabs[targetIndex].focus();
    selectAgeTab(ageTabs[targetIndex]);
  });
});
moveAgeIndicator();
new ResizeObserver(moveAgeIndicator).observe(kidsTabs);
document.fonts.ready.then(moveAgeIndicator);
