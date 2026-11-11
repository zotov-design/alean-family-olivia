/* Headings rise by word, paragraphs by line. Keep the authored line breaks
   as layout boundaries and the full phrase as the accessible name. */
function prepareText(element) {
  const marker = element.querySelector("i");
  const lines = element.innerHTML.replace(/<i><\/i>/g, "").split(/<br\s*\/?>/i).map(line => line.trim());
  const paragraph = element.closest(".description");
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const phrases = mobile ? [lines.join(" ")] : lines;
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
});

// Keep the rising color fill independent of the booking fields' rolling text.
document.querySelectorAll(".action, .search-rooms").forEach(control => {
    const surface = document.createElement("span");
    surface.className = "hover-surface";
    surface.setAttribute("aria-hidden", "true");
    surface.append(...Array.from(control.children, child => child.cloneNode(true)));
    control.append(surface);
});

const header = document.querySelector("header");
const menuToggle = header.querySelector(".menu-toggle");
const headerNav = header.querySelector("#header-nav");
const compactHeader = matchMedia("(max-width: 760px)");

function setHeaderMenu(open) {
  menuToggle.setAttribute("aria-expanded", String(open));
  header.classList.toggle("menu-open", open);
  headerNav.inert = compactHeader.matches && !open;
}

setHeaderMenu(false);
menuToggle.addEventListener("click", () => setHeaderMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
headerNav.addEventListener("click", event => {
  if (event.target.closest("a")) setHeaderMenu(false);
});
document.addEventListener("click", event => {
  if (!header.contains(event.target)) setHeaderMenu(false);
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
  setHeaderMenu(false);
  menuToggle.focus();
});
compactHeader.addEventListener("change", () => setHeaderMenu(false));

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
    const textNodes = Array.from(document.querySelectorAll("[data-text]")).filter(el => !el.closest("[hidden]"));
    const originals = textNodes.map(el => el.innerHTML);
    textNodes.forEach(prepareText);
    let scroller, tick, entranceFrame;
    function scrollRoomSequence(event) {
      if (!scroller) return;
      event.preventDefault();
      scroller.scrollTo(event.detail.top, {
        duration: event.detail.duration ?? 1.15,
        easing: t => (1 - Math.cos(Math.PI * t)) / 2,
        lock: true,
        force: true,
        onComplete: event.detail.complete
      });
    }
    document.addEventListener("room-sequence-scroll", scrollRoomSequence);
    const scrollLinks = document.querySelectorAll('.hero-copy a[href="#season-offer"], .sale-card a[href="#rooms"], .thumb-link, .booking-shortcut');
    function scrollToSection(event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.currentTarget;
      const target = document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, "", link.hash);
      target.focus({preventScroll: true});
      if (scroller) {
        const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        const motion = link.hash === "#season-offer"
          ? {duration: 1.35}
          : {duration: 1.85, easing: t => (1 - Math.cos(Math.PI * t)) / 2};
        scroller.scrollTo(target, {offset: -offset, ...motion});
      } else {
        target.scrollIntoView({behavior: animated ? "smooth" : "instant"});
      }
    }
    scrollLinks.forEach(link => link.addEventListener("click", scrollToSection));
    if (animated) {
      if (window.Lenis) {
        scroller = new Lenis({
          virtualScroll: ({event, deltaX, deltaY}) => {
            if (Math.abs(deltaX) <= Math.abs(deltaY) && !event.shiftKey) return true;
            return !event.target.closest?.(".room-table-scroll");
          },
          duration: 1.2, smoothWheel: true, syncTouch: true, touchMultiplier: 1.5,
          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
        scroller.on("scroll", ScrollTrigger.update);
        tick = time => scroller.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
      }
      // On load, the visible part of the hero has its own timed entrance.
      // Early reveals follow the scroll. Later sections play a timed entrance
      // once visible so a fast scroll cannot snap them to their final state.
      function revealTrigger(el) {
        if (el.closest(".hero")) {
          if (el.getBoundingClientRect().top < innerHeight) return undefined;
          return {trigger:el,once:true,start:"top 98%"};
        }
        const rect = el.getBoundingClientRect();
        if (rect.top < innerHeight && rect.bottom > 0) return undefined;
        if (el.closest(".accommodations, .dining-section, .kids-section, .sea-section, .booking, .faq-section, .callback-section, .site-footer")) {
          return {trigger:el,start:"clamp(top 96%)",once:true};
        }
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
        const top = el.hasAttribute("data-wipe-top-overflow") ? "-5rem" : "0rem";
        tl.fromTo(el, {clipPath:"inset(0% 0% 100% 0%)"}, {
          clipPath:`inset(${top} 0% 0% 0%)`,duration:.9,ease:"power2.inOut"
        });
        const img = el.querySelector(":scope > img, :scope > [data-wipe-media]");
        if (img) tl.from(img, {scale:1.5,duration:.9,ease:"power2.inOut"},0);
      }
      const artwork = Array.from(document.querySelectorAll("[data-wipe]")).filter(el =>
        !el.closest("[hidden]") && (!compact || !el.matches(".faq-list") && !el.closest(".callback-visual"))
      );
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
      gsap.fromTo(".wave", {yPercent:-16}, {
        yPercent:22,ease:"none",scrollTrigger:{trigger:".about",start:"top bottom",end:"bottom top",scrub:true}
      });
      gsap.fromTo(".kids-waves", {yPercent:-14}, {
        yPercent:20,ease:"none",scrollTrigger:{trigger:".kids-section",start:"top bottom",end:"bottom top",scrub:true}
      });
      const statsScroll = {
        trigger: ".stats", start: "clamp(top 90%)", end: "clamp(top 10%)", scrub: .9
      };
      if (compact) {
        gsap.from(".stat", {
          y: 24, autoAlpha: 0, stagger: .24, duration: .64, ease: "sine.inOut",
          scrollTrigger: statsScroll
        });
      } else {
        // Keep the lower edges behind the hotel while the top edges rise.
        gsap.fromTo(".stat", {
          top: index => (index === 0 ? 1.5 : index * 9.375) + "rem"
        }, {
          top: "0rem", stagger: .24, duration: .64, ease: "sine.inOut",
          scrollTrigger: statsScroll
        });
      }
      // The transparent PNG overlaps the statistics. Move upward from below
      // its final position, keeping its lower edge behind the sea-green fade.
      gsap.fromTo(".hotel", {yPercent:compact ? 4 : 9}, {
          yPercent:0,ease:"none",scrollTrigger:{trigger:".hotel-scene",start:"top bottom",end:"bottom 60%",scrub:true}
      });
      for (const [brush, section] of [
        [".dessert-brush", ".dining-section"],
        [".callback-brush", ".callback-section"]
      ]) {
        const travel = compact ? 8 : 16;
        gsap.fromTo(brush, {y: travel}, {
          y:-travel,ease:"none",scrollTrigger:{trigger:section,start:"top bottom",end:"bottom top",scrub:.5}
        });
      }
    }
    return () => {
      scrollLinks.forEach(link => link.removeEventListener("click", scrollToSection));
      window.removeEventListener("pageshow", context.afterRestore);
      cancelAnimationFrame(entranceFrame);
      document.removeEventListener("room-sequence-scroll", scrollRoomSequence);
      if (scroller) {gsap.ticker.remove(tick);scroller.destroy();}
      textNodes.forEach((el, i) => {el.innerHTML = originals[i];});
    };
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
