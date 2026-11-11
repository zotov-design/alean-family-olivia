const reduceResortMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function onHorizontalSwipe(element, changeSlide) {
  let start;
  element.addEventListener("touchstart", event => {
    start = event.touches.length === 1 ? event.touches[0] : null;
  }, {passive: true});
  element.addEventListener("touchend", event => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const x = touch.clientX - start.clientX;
    const y = touch.clientY - start.clientY;
    start = null;
    if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y)) changeSlide(x < 0 ? 1 : -1);
  }, {passive: true});
  element.addEventListener("touchcancel", () => { start = null; });
}

for (const gallery of document.querySelectorAll(".room-visual")) {
  const sequenceGallery = Boolean(gallery.closest(".room-sequence"));
  const slides = Array.from(gallery.querySelectorAll(".room-slide"));
  const status = gallery.querySelector(".room-photo-status");
  const pagination = document.createElement("div");
  pagination.className = "room-pagination slide-pagination";
  pagination.setAttribute("role", "group");
  pagination.setAttribute("aria-label", "Выбор фотографии");
  let active = 0;
  let reveal;
  let preview;
  let previewImage;

  if (gallery.closest(".room-sequence") && slides.length > 1) {
    preview = document.createElement("button");
    preview.type = "button";
    preview.className = "room-photo-preview";
    preview.setAttribute("aria-label", "Показать следующее фото");
    previewImage = document.createElement("img");
    previewImage.alt = "";
    previewImage.loading = "lazy";
    previewImage.src = slides[1].src;
    preview.append(previewImage);
    if (sequenceGallery) {
      const frame = document.createElement("div");
      frame.className = "room-photo-frame";
      frame.append(gallery.querySelector(".room-gallery-media"), preview);
      gallery.prepend(frame);
    } else {
      gallery.append(preview);
    }
    preview.addEventListener("click", () => changeRoomPhoto(1));
    if (sequenceGallery) {
      const entrance = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        revealRoomPreview();
        entrance.disconnect();
      });
      entrance.observe(preview);
    }
  }

  function revealRoomPreview() {
    if (reduceResortMotion.matches || !sequenceGallery) return;
    const timing = {duration: 700, easing: "cubic-bezier(.25,1,.5,1)"};
    preview.animate([{clipPath: "inset(100% 0 0)"}, {clipPath: "inset(0)"}], timing);
    previewImage.animate([{scale: 1.35}, {scale: 1}], timing);
  }

  const indicators = slides.map((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Фото ${index + 1} из ${slides.length}`);
    button.setAttribute("aria-current", String(index === 0));
    button.addEventListener("click", () => changeRoomPhoto(index - active));
    pagination.append(button);
    return button;
  });
  gallery.append(pagination);

  function changeRoomPhoto(direction) {
    if (!direction) return;
    const previous = slides[active];
    active = (active + direction + slides.length) % slides.length;
    const next = slides[active];
    indicators.forEach((button, index) => button.setAttribute("aria-current", String(index === active)));
    reveal?.cancel();
    slides.forEach(slide => {
      slide.classList.toggle("is-current", slide === next);
      slide.classList.toggle("is-previous", slide === previous && !reduceResortMotion.matches);
      slide.setAttribute("aria-hidden", String(slide !== next));
    });
    if (preview) {
      const updatePreview = () => {
        previewImage.src = slides[(active + 1) % slides.length].src;
        preview.classList.remove("is-revealing");
        revealRoomPreview();
      };
      if (reduceResortMotion.matches) {
        updatePreview();
      } else {
        const bounds = gallery.getBoundingClientRect();
        const square = preview.getBoundingClientRect();
        const x = (bounds.width - square.width) / 2;
        const y = (bounds.height - square.height) / 2;
        preview.classList.add("is-revealing");
        const timing = {duration: 750, easing: "cubic-bezier(.25,1,.5,1)"};
        reveal = next.animate([
          {clipPath: `inset(${y}px ${x}px)`},
          {clipPath: "inset(0)"}
        ], timing);
        reveal.onfinish = () => {
          previous.classList.remove("is-previous");
          updatePreview();
        };
      }
    } else if (!reduceResortMotion.matches) {
      const start = direction > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
      const timing = {duration: 850, easing: "cubic-bezier(.25,1,.5,1)"};
      reveal = next.animate([
        {clipPath: start, scale: 1.5},
        {clipPath: "inset(0)", scale: 1}
      ], timing);
      reveal.onfinish = () => previous.classList.remove("is-previous");
    }
    status.textContent = `Фото ${active + 1} из ${slides.length}`;
  }

  for (const button of gallery.querySelectorAll("[data-room-step]")) {
    button.addEventListener("click", () => changeRoomPhoto(Number(button.dataset.roomStep)));
  }
  onHorizontalSwipe(gallery, changeRoomPhoto);
}

for (const sequence of document.querySelectorAll(".room-sequence")) {
  const stage = sequence.querySelector(".room-stage");
  const cards = Array.from(stage.querySelectorAll(".room-category"));
  const suites = sequence.classList.contains("room-sequence-suites");
  const firstGallery = cards[0].querySelector(".room-visual");
  const details = cards.map(card => card.querySelector(".room-details"));
  const headings = details.map(detail => detail.querySelector("h2"));
  const layout = matchMedia("(min-width: 761px) and (min-height: 540px), (min-width: 360px) and (min-height: 740px)");
  const eyebrow = stage.querySelector(".eyebrow");
  const caption = eyebrow.cloneNode(true);
  caption.classList.add("room-sequence-caption");
  stage.prepend(caption);
  let frame = 0;
  let activeIndex = -1;
  let rail;
  let sharedControls;
  let panels;
  let suiteTags;
  let titleButtons;
  let previousProgress;
  let automaticScrollUntil = 0;
  let entranceMotion;
  let roomText;
  let copyReveal;
  let copyTarget;
  let suiteIntroHold = false;
  let lastWheelAt = -Infinity;
  let touchInProgress = false;

  const words = elements => elements.flatMap(element => Array.from(element.querySelectorAll(".word")));
  const textMotion = {yPercent: 0, duration: .9, stagger: .065, ease: "power2.out"};

  function addRoomDetailEntrance(timeline, index) {
    const panel = panels?.[index] ?? details[index];
    const audience = panel.querySelector(".room-audience");
    timeline.fromTo(panel.querySelector(".room-amenities"), {y: 14, autoAlpha: 0},
      {y: 0, autoAlpha: 1, duration: .55, ease: "power2.out"}, .1);
    timeline.fromTo(audience, {"--audience-background": 0},
      {"--audience-background": 1, duration: .6, ease: "power2.out"}, .12);
    timeline.fromTo(words(roomText[index]), {yPercent: 135}, {
      ...textMotion, stagger: {amount: .22}
    }, .16);
    timeline.fromTo(panel.querySelector(".room-rate"), {y: 12, autoAlpha: 0},
      {y: 0, autoAlpha: 1, duration: .55, ease: "power2.out"}, .25);
  }

  function playRoomEntrance(index) {
    if (!roomText || reduceResortMotion.matches) return;
    entranceMotion?.revert();
    entranceMotion = gsap.context(() => {
      const timeline = gsap.timeline();
      timeline.fromTo(words([caption, titleButtons[1 - index]]), {yPercent: 135}, textMotion, 0);
      timeline.fromTo(cards[index].querySelector(".room-visual"),
        {clipPath: "inset(0 0 100% 0)"}, {clipPath: "inset(0)", duration: .9, ease: "power2.inOut"}, 0);
      timeline.fromTo(sharedControls, {autoAlpha: 0},
        {autoAlpha: 1, duration: .45, ease: "power2.out"}, .42);
      timeline.fromTo(words([titleButtons[index]]), {yPercent: 135}, textMotion, .08);
      addRoomDetailEntrance(timeline, index);
    }, stage);
  }

  function prepareCopyReveal(target) {
    copyReveal?.revert();
    copyReveal = undefined;
    copyTarget = target;
    panels[1 - target].style.removeProperty("--room-copy-reveal");
    panels[target].style.setProperty("--room-copy-reveal", 0);
  }

  function goToRoom(position, duration) {
    const {offset, travel} = measure();
    const top = scrollY - offset + travel * position;
    {
      const target = position > .5 ? 1 : 0;
      if (roomText && target !== copyTarget) {
        if (target !== activeIndex) {
          prepareCopyReveal(target);
        } else if (copyTarget !== undefined) {
          copyReveal?.revert();
          panels[copyTarget].style.removeProperty("--room-copy-reveal");
          copyTarget = undefined;
          copyReveal = undefined;
        }
      }
      automaticScrollUntil = performance.now() + 1500;
      const request = new CustomEvent("room-sequence-scroll", {
        bubbles: true,
        cancelable: true,
        detail: {
          top,
          duration,
          complete: () => { automaticScrollUntil = 0; }
        }
      });
      if (!sequence.dispatchEvent(request)) return;
    }
    scrollTo({top, behavior: "smooth"});
  }

  sharedControls = firstGallery.querySelector(".room-gallery-controls").cloneNode(true);
  sharedControls.classList.add("room-shared-controls");
  sharedControls.setAttribute("aria-label", "Фотографии выбранного номера");
  sharedControls.querySelectorAll("[data-room-step]").forEach(button => {
    button.addEventListener("click", () => {
      cards[activeIndex].querySelector(`[data-room-step="${button.dataset.roomStep}"]`).click();
    });
  });

  rail = document.createElement("div");
  rail.className = suites ? "room-suite-copy" : "room-copy-rail";
  stage.append(rail, sharedControls);

  {
    titleButtons = headings.map((heading, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "room-copy-title";
      button.append(...heading.childNodes);
      button.addEventListener("click", () => {
        suiteIntroHold = false;
        goToRoom(i === 0 ? (suites ? .36 : .04) : .96);
      });
      heading.append(button);
      return button;
    });
    panels = details.map((detail, i) => {
      const panel = document.createElement("div");
      const body = document.createElement("div");
      panel.className = "room-copy-panel";
      panel.id = `room-copy-panel-${suites ? "suite" : "standard"}-${i + 1}`;
      body.className = "room-copy-body";
      body.append(...Array.from(detail.children).filter(child => child.matches(".room-amenities, .room-audience, .room-rate")));
      panel.append(body);
      detail.append(panel);
      titleButtons[i].setAttribute("aria-controls", panel.id);
      return panel;
    });
    if (!suites && window.gsap && typeof prepareText === "function") {
      roomText = panels.map(panel => Array.from(panel.querySelectorAll(".room-audience strong, .room-audience p")));
      [caption, ...titleButtons, ...roomText.flat()].forEach(prepareText);
      roomText.flat().forEach(element => {
        const words = Array.from(element.querySelectorAll(".word"));
        words.forEach((word, i) => {
          word.style.setProperty("--word-delay", .2 * i / Math.max(1, words.length - 1));
        });
      });
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || !sequence.classList.contains("is-scroll-sequence")) return;
        playRoomEntrance(activeIndex);
        observer.disconnect();
      }, {rootMargin: "0px 0px 24px 0px"});
      observer.observe(firstGallery);
    }
  }
  if (suites) {
    suiteTags = cards.map((card, i) => {
      const badge = card.querySelector(".room-photo-badge");
      const tag = document.createElement("div");
      const content = document.createElement("div");
      tag.className = "room-suite-tag";
      if (badge) content.append(badge);
      tag.append(content);
      headings[i].before(tag);
      return tag;
    });
    if (window.gsap && typeof prepareText === "function") {
      roomText = details.map(detail => Array.from(detail.querySelectorAll(".room-audience strong, .room-audience p")));
      [caption, ...titleButtons, ...roomText.flat()].forEach(prepareText);
    }
  }

  function selectCard(index) {
    if (activeIndex === index) return;
    if (roomText && activeIndex !== -1 && copyTarget !== index) prepareCopyReveal(index);
    const moveFocus = cards[activeIndex]?.contains(document.activeElement) ||
      (suites ? details : panels)?.[activeIndex]?.contains(document.activeElement);
    activeIndex = index;
    cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === index);
      card.inert = i !== index;
    });
    panels?.forEach((panel, i) => {
      panel.inert = i !== index;
      titleButtons[i].setAttribute("aria-expanded", String(i === index));
    });
    if (moveFocus) (titleButtons?.[index] ?? headings[index]).focus({preventScroll: true});
  }

  function measure() {
    const top = parseFloat(getComputedStyle(stage).top);
    return {
      offset: top - sequence.getBoundingClientRect().top,
      travel: Math.max(1, sequence.offsetHeight - stage.offsetHeight)
    };
  }

  function render() {
    frame = 0;
    if (!sequence.classList.contains("is-scroll-sequence")) return;
    const {offset, travel} = measure();
    const progress = offset / travel;
    // Map the suite's scroll range after the intro to the same room transition.
    const roomProgress = suites ? .04 + (progress - .36) * .92 / .6 : progress;
    const slide = Math.max(0, Math.min(1, (roomProgress - .27) / .46));
    const photo = Math.max(0, Math.min(1, (roomProgress - .27) / (.93 - .27)));
    selectCard(roomProgress >= .55 ? 1 : 0);
    if (!suites) {
      if (entranceMotion && slide > 0 && slide < 1) {
        entranceMotion.revert();
        entranceMotion = undefined;
      }
      const eased = slide * slide * (3 - 2 * slide);
      stage.style.setProperty("--room-slide-progress", eased);
      stage.style.setProperty("--room-photo-progress", photo * photo * (3 - 2 * photo));
      stage.classList.toggle("is-family-photo-ready", photo === 1);
      panels[0].style.gridTemplateRows = `${1 - eased}fr`;
      panels[1].style.gridTemplateRows = `${eased}fr`;
      const opening = copyTarget === 1 ? slide : 1 - slide;
      if (copyTarget !== undefined && !copyReveal && opening === 1) {
        panels[copyTarget].style.setProperty("--room-copy-reveal", 1);
        copyReveal = gsap.timeline();
        addRoomDetailEntrance(copyReveal, copyTarget);
      }
      const forward = previousProgress < .08 && progress >= .08 && progress < .83;
      const backward = previousProgress > .92 && progress <= .92 && progress > .27;
      previousProgress = progress;
      if (performance.now() >= automaticScrollUntil) {
        if (forward) goToRoom(.96);
        else if (backward) goToRoom(.04);
      }
    }
    if (suites) {
      if (progress < .15 || progress > 1.05) suiteIntroHold = false;
      const zoom = Math.max(0, Math.min(1, progress / .32));
      stage.style.setProperty("--suite-zoom", zoom);
      stage.style.setProperty("--suite-copy", Math.max(0, (zoom - .35) / .65));
      stage.style.setProperty("--suite-photo-progress", photo * photo * (3 - 2 * photo));
      sharedControls.inert = zoom < .6;
      if (zoom < .45 && copyTarget !== undefined) {
        copyReveal?.revert();
        copyReveal = undefined;
        copyTarget = undefined;
      }
      const showCopy = zoom === 1;
      const easedCopy = slide * slide * (3 - 2 * slide);
      stage.style.setProperty("--suite-detail-mix", easedCopy);
      const openings = [1 - easedCopy, easedCopy];
      // Keep the revealed badge in place until its row has folded away.
      if (photo === 1 || openings[1] === 0) {
        stage.classList.toggle("is-suite-photo-ready", photo === 1);
      }
      openings.forEach((opening, i) => {
        panels[i].style.gridTemplateRows = `${opening}fr`;
        suiteTags[i].style.gridTemplateRows = `${opening}fr`;
        suiteTags[i].inert = i !== activeIndex;
      });
      stage.classList.toggle("is-suite-copy-ready", showCopy);
      const revealIndex = copyTarget ?? activeIndex;
      if (showCopy && roomText && !copyReveal && revealIndex === activeIndex && openings[revealIndex] === 1) {
        const initial = copyTarget === undefined;
        copyTarget = revealIndex;
        panels[revealIndex].style.setProperty("--room-copy-reveal", 1);
        copyReveal = gsap.timeline();
        if (initial) {
          copyReveal.fromTo(words([titleButtons[1 - revealIndex]]), {yPercent: 135}, textMotion, 0);
          copyReveal.fromTo(words([titleButtons[revealIndex]]), {yPercent: 135}, textMotion, .08);
        }
        addRoomDetailEntrance(copyReveal, revealIndex);
      }
      const forward = previousProgress < .08 && roomProgress >= .08 && roomProgress < .83;
      const backward = previousProgress > .92 && roomProgress <= .92 && roomProgress > .27;
      const reachedIntro = previousProgress < 0 && roomProgress >= 0 && activeIndex === 0;
      previousProgress = roomProgress;
      if (performance.now() >= automaticScrollUntil) {
        if (reachedIntro) {
          suiteIntroHold = touchInProgress || performance.now() - lastWheelAt < 200;
          goToRoom(.36, .28);
        } else if (forward && !suiteIntroHold) goToRoom(.96);
        else if (backward) goToRoom(.36);
      }
    }
  }

  function queueRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function alignCaption() {
    if (suites || !sequence.classList.contains("is-scroll-sequence")) return;
    const galleryTop = cards[0].offsetTop + firstGallery.offsetTop;
    stage.style.setProperty("--room-caption-top", `${galleryTop}px`);
    stage.style.setProperty("--room-gallery-bottom", `${galleryTop + firstGallery.offsetHeight}px`);
    stage.style.setProperty("--room-gallery-left", `${cards[0].offsetLeft + firstGallery.offsetLeft}px`);
  }

  function syncLayout() {
    const enabled = layout.matches && !reduceResortMotion.matches;
    sequence.classList.toggle("is-scroll-sequence", enabled);
    previousProgress = undefined;
    automaticScrollUntil = 0;
    suiteIntroHold = false;
    if (rail) {
      details.forEach((detail, i) => {
        const parent = enabled ? rail : cards[i];
        if (detail.parentElement !== parent) {
          if (enabled) parent.append(detail);
          else parent.prepend(detail);
        }
        if (titleButtons) {
          titleButtons[i].disabled = !enabled;
          if (!enabled) titleButtons[i].removeAttribute("aria-expanded");
        }
      });
    }
    if (enabled) {
      alignCaption();
      render();
    } else {
      entranceMotion?.revert();
      copyReveal?.revert();
      copyReveal = undefined;
      copyTarget = undefined;
      activeIndex = -1;
      cards.forEach(card => { card.inert = false; });
      suiteTags?.forEach(tag => { tag.inert = false; });
      panels?.forEach(panel => {
        panel.inert = false;
        panel.style.removeProperty("--room-copy-reveal");
      });
    }
  }

  layout.addEventListener("change", syncLayout);
  reduceResortMotion.addEventListener("change", syncLayout);
  if (suites) {
    window.addEventListener("wheel", event => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
      const now = performance.now();
      const freshGesture = now - lastWheelAt >= 200;
      lastWheelAt = now;
      if (!suiteIntroHold) return;
      if (freshGesture) {
        suiteIntroHold = false;
        if (event.deltaY < 0) return;
        goToRoom(.96);
      }
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    }, {capture: true, passive: false});
    window.addEventListener("touchstart", () => {
      touchInProgress = true;
      suiteIntroHold = false;
    }, {passive: true});
    window.addEventListener("touchmove", event => {
      if (!suiteIntroHold) return;
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    }, {capture: true, passive: false});
    for (const eventName of ["touchend", "touchcancel"]) {
      window.addEventListener(eventName, () => { touchInProgress = false; }, {passive: true});
    }
  }
  window.addEventListener("scroll", queueRender, {passive: true});
  window.addEventListener("resize", queueRender);
  window.addEventListener("pageshow", queueRender);
  syncLayout();
  if (!suites) {
    const captionLayout = new ResizeObserver(alignCaption);
    captionLayout.observe(stage);
    captionLayout.observe(firstGallery);
  }
}

const diningTrack = document.querySelector(".dining-track");
const diningCards = Array.from(diningTrack.children);
const firstDiningPosition = 2;
const diningPagination = document.querySelector(".dining-pagination");
const diningIndicators = diningCards.map((card, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", card.querySelector("h3").textContent);
  button.setAttribute("aria-controls", "dining-track");
  button.addEventListener("click", () => selectDiningCard(firstDiningPosition + index));
  diningPagination.append(button);
  return button;
});
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
  diningIndicators.forEach((button, index) => button.setAttribute("aria-current", String(index === activeIndex)));
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

onHorizontalSwipe(diningTrack, direction => selectDiningCard(diningPosition + direction));

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
