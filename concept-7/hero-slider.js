(() => {
  const hero = document.querySelector(".hero");
  const controls = hero.querySelector(".slide-controls");
  const buttons = Array.from(controls.children);
  const photos = Array.from(hero.querySelectorAll(".slide-photo"));
  const title = hero.querySelector("h1");
  const location = hero.querySelector(".slide-location");
  const locationExtra = hero.querySelector(".location-extra");
  let locationExtraAnimation;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 6000;
  let current = 0, timer, visible = false, paused = motion.matches;

  buttons.forEach((button, index) => {
    const preview = photos[index].firstElementChild.cloneNode();
    preview.className = "";
    preview.alt = "";
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 104 66");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("width", "104");
    rect.setAttribute("height", "66");
    rect.setAttribute("pathLength", "1");
    svg.append(rect);
    button.replaceChildren(preview, svg);
    button.addEventListener("click", () => {
      if (current !== index) show(index);
      else { paused = !paused; syncPlayback(); }
    });
  });

  function syncPlayback() {
    const active = buttons[current];
    active.dataset.paused = String(paused);
    active.setAttribute("aria-label", active.dataset.title.replace("|"," ") +
      (paused ? " — продолжить показ" : " — приостановить показ"));
    if (paused || !visible || document.hidden) timer.pause();
    else timer.play();
  }

  function show(index) {
    timer?.cancel();
    const previous = current;
    current = index;
    hero.dataset.slide = index;
    buttons.forEach((button, i) => {
      const active = i === index;
      button.setAttribute("aria-current", String(active));
      button.setAttribute("aria-label", "Показать слайд: " + button.dataset.title.replace("|"," "));
      delete button.dataset.paused;
      photos[i].classList.toggle("previous", i === previous && !active);
      photos[i].classList.toggle("current", active);
      photos[i].setAttribute("aria-hidden", String(!active));
    });
    if (index !== previous && window.gsap) {
      const outgoing = [photos[previous], photos[previous].firstElementChild];
      gsap.killTweensOf(outgoing);
      gsap.set(outgoing, {clearProps:"clipPath,transform"});
      if (!motion.matches) {
        const tl = gsap.timeline({defaults:{duration:.9,ease:"power2.inOut"}});
        tl.fromTo(photos[index], {clipPath:"inset(100% 0 0)"}, {clipPath:"inset(0% 0 0)"})
          .fromTo(photos[index].firstElementChild, {scale:1.5}, {scale:1}, 0);
      }
    }

    const button = buttons[index];
    location.textContent = button.dataset.location;
    locationExtraAnimation?.cancel();
    if (index === 0 && !motion.matches) {
      locationExtraAnimation = locationExtra.animate(
        [{opacity: 0, transform: "translateY(35%)"}, {opacity: 1, transform: "translateY(0)"}],
        {duration: 750, easing: "cubic-bezier(.2,.78,.2,1)", fill: "backwards"}
      );
    }
    title.replaceChildren();
    button.dataset.title.split("|").forEach((line, i) => {
      if (i) title.append(document.createElement("br"));
      title.append(line);
    });
    [location, title].forEach(element => {
      prepareText(element);
      if (motion.matches) return;
      element.querySelectorAll(".word").forEach((word, i) => {
        word.animate([{transform:"translateY(125%)"},{transform:"translateY(0)"}], {
          duration:750, delay:i * 55, easing:"cubic-bezier(.2,.78,.2,1)", fill:"backwards"
        });
      });
    });

    timer = button.querySelector("rect").animate(
      [{strokeDashoffset:1},{strokeDashoffset:0}], {duration, fill:"both"}
    );
    timer.onfinish = () => show((current + 1) % buttons.length);
    syncPlayback();
  }

  controls.classList.add("ready");
  show(0);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }).observe(hero);
  document.addEventListener("visibilitychange", syncPlayback);
  motion.addEventListener("change", () => { paused = motion.matches; syncPlayback(); });
})();
