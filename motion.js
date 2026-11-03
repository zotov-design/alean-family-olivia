/* Headings rise by word, paragraphs by line. Keep the authored line breaks
   as layout boundaries and the full phrase as the accessible name. */
function prepareText(element) {
  const marker = element.querySelector("i");
  const lines = element.innerHTML.replace(/<i><\/i>/g, "").split(/<br\s*\/?>/i);
  const paragraph = element.closest(".description");
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const phrases = paragraph && mobile ? [lines.join(" ")] : lines;
  element.setAttribute("aria-label", lines.join(" "));
  element.replaceChildren();
  if (marker) element.append(marker);
  phrases.forEach(phrase => {
    const mask = document.createElement("span");
    mask.className = "line";
    const line = document.createElement("span");
    line.className = "line-inner";
    if (paragraph) {
      line.textContent = phrase;
    } else {
      phrase.split(" ").forEach((word, i) => {
        if (i) line.append(" ");
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = word;
        line.append(span);
      });
    }
    mask.append(line);
    element.append(mask);
  });
}

function renderRoll(label, text) {
  const roll = document.createElement("span");
  roll.className = "roll";
  roll.setAttribute("aria-hidden", "true");
  const row = document.createElement("span");
  row.className = "roll-row";
  Array.from(text).forEach((char, i) => {
    const letter = document.createElement("span");
    letter.style.setProperty("--i", i);
    letter.textContent = char;
    row.append(letter);
  });
  const copy = row.cloneNode(true);
  copy.classList.add("copy");
  roll.append(row, copy);
  label.replaceChildren(roll);
}

document.querySelectorAll("[data-roll]").forEach(label => {
  const text = label.textContent;
  const control = label.closest("a, button");
  const fieldLabel = control.querySelector(".field-label");
  control.setAttribute("aria-label", fieldLabel ? fieldLabel.textContent + ", " + text : text);
  renderRoll(label, text);
  // Clip the hover ink and its background together so every moving letter
  // stays legible on both sides of the rising color boundary.
  if (control.matches(".action, .search-rooms")) {
    const surface = document.createElement("span");
    surface.className = "hover-surface";
    surface.setAttribute("aria-hidden", "true");
    surface.append(...Array.from(control.children, child => child.cloneNode(true)));
    control.append(surface);
  }
});

const header = document.querySelector("header");
let lastHeaderY = Math.max(0, window.scrollY);
function updateHeader() {
  const y = Math.max(0, window.scrollY);
  if (y < 2) {
    header.classList.remove("is-away", "is-white");
  } else {
    if (Math.abs(y - lastHeaderY) < 4) return;
    header.classList.toggle("is-away", y > lastHeaderY);
    if (y < lastHeaderY) header.classList.add("is-white");
  }
  lastHeaderY = y;
}
window.addEventListener("scroll", updateHeader, {passive:true});

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({
    animated: "(prefers-reduced-motion: no-preference)",
    compact: "(max-width: 760px)",
    desktop: "(min-width: 761px)"
  }, context => {
    const { animated, compact } = context.conditions;
    const textNodes = Array.from(document.querySelectorAll("[data-text]"));
    const originals = textNodes.map(el => el.innerHTML);
    textNodes.forEach(prepareText);
    let scroller, tick, entranceFrame;
    if (animated) {
      if (window.Lenis) {
        scroller = new Lenis({
          duration: 1.2, smoothWheel: true, syncTouch: true, touchMultiplier: 1.5,
          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
        scroller.on("scroll", ScrollTrigger.update);
        tick = time => scroller.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
      }
      // On load, the visible part of the pinned hero has its own timed entrance.
      // Everything below it uses scroll distance, so pausing the scroll pauses the reveal.
      const stage = document.querySelector(".hero-stage");
      const hero = stage.querySelector(".hero");
      const holdDistance = () => stage.offsetHeight - hero.offsetHeight;
      function revealTrigger(el) {
        if (el.closest(".hero")) {
          if (el.getBoundingClientRect().top < innerHeight) return undefined;
          return {trigger:stage,once:true,start:()=>stage.getBoundingClientRect().top + scrollY +
            holdDistance() + el.getBoundingClientRect().top - hero.getBoundingClientRect().top - innerHeight * .98};
        }
        const rect = el.getBoundingClientRect();
        if (rect.top < innerHeight && rect.bottom > 0) return undefined;
        return {trigger:el,start:"clamp(top 98%)",end:"clamp(top 68%)",scrub:true};
      }
      gsap.from(".hero-copy .action", {opacity:0,y:12,duration:.8,delay:.18,ease:"power3.out"});
      function animateText(el) {
        const paragraph = el.closest(".description");
        gsap.from(el.querySelectorAll(paragraph ? ".line-inner" : ".word"), {
          yPercent: paragraph ? 110 : 135, stagger: .065, duration: .9, ease: "power2.out",
          scrollTrigger: revealTrigger(el)
        });
      }
      function animateArtwork(el) {
        const tl = gsap.timeline({scrollTrigger:revealTrigger(el)});
        tl.fromTo(el, {clipPath:"inset(0% 0% 100% 0%)"}, {
          clipPath:"inset(0% 0% 0% 0%)",duration:.9,ease:"power2.inOut"
        });
        const img = el.querySelector(":scope > img");
        if (img) tl.from(img, {scale:1.5,duration:.9,ease:"power2.inOut"},0);
      }
      const artwork = Array.from(document.querySelectorAll("[data-wipe]"));
      textNodes.filter(el=>el.closest(".hero")).forEach(animateText);
      artwork.filter(el=>el.closest(".hero")).forEach(animateArtwork);
      // Scroll restoration happens around pageshow. Visible restored content
      // needs a timed entrance; offscreen elements keep their scroll timeline.
      context.add("entrances", () => {
        textNodes.filter(el=>!el.closest(".hero")).forEach(animateText);
        artwork.filter(el=>!el.closest(".hero")).forEach(animateArtwork);
        ScrollTrigger.refresh();
      });
      context.add("afterRestore", () => {
        entranceFrame = requestAnimationFrame(() => {
          entranceFrame = requestAnimationFrame(context.entrances);
        });
      });
      if (document.readyState === "complete") context.afterRestore();
      else window.addEventListener("pageshow", context.afterRestore, {once:true});
      gsap.to(".facade", {
        yPercent: 18, ease:"none", scrollTrigger:{
          trigger:stage,start:()=>"top+=" + holdDistance() + " top",
          end:"bottom top",scrub:true
        }
      });
      const copy = hero.querySelector(".hero-copy");
      const presale = hero.querySelector(".presale");
      gsap.fromTo(copy, {y:0}, {
        y:() => {
          const travel = hero.offsetHeight * .18;
          // In portrait the card shares the text column. Keep the CTA above it.
          if (compact && innerHeight >= innerWidth) {
            const labelTop = presale.offsetTop + parseFloat(getComputedStyle(presale).paddingTop);
            return Math.max(0, Math.min(travel, labelTop - copy.offsetTop - copy.offsetHeight - 24));
          }
          return travel;
        },
        ease:"none", scrollTrigger:{trigger:stage,start:"top top",end:"bottom top",scrub:true,invalidateOnRefresh:true}
      });
      gsap.fromTo(".wave", {yPercent:-16}, {
        yPercent:22,ease:"none",scrollTrigger:{trigger:".about",start:"top bottom",end:"bottom top",scrub:true}
      });
      // The transparent PNG overlaps the statistics. Move upward from below
      // its final position, keeping its lower edge behind the sea-green fade.
      gsap.fromTo(".hotel", {yPercent:compact ? 4 : 9}, {
        yPercent:0,ease:"none",scrollTrigger:{trigger:".hotel-scene",start:"top bottom",end:"bottom 60%",scrub:true}
      });
    }
    return () => {
      window.removeEventListener("pageshow", context.afterRestore);
      cancelAnimationFrame(entranceFrame);
      if (scroller) {gsap.ticker.remove(tick);scroller.destroy();}
      textNodes.forEach((el, i) => {el.innerHTML = originals[i];});
    };
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
