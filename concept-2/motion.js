const opening = document.querySelector('.opening');
const screen = opening.querySelector('.screen');
const track = opening.querySelector('.track');
const still = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 761px)');
const amenities = document.querySelector('.amenities');
const stats = document.querySelector('.stats');
const card = document.querySelector('.hero-card');
const clamp = value => Math.max(0, Math.min(1, value));

// Average four subpixel samples of the same vector. A sample offset is measured
// in screen pixels so thin details stay sharp after a pinch zoom or DPI change.
function smoothVectorEdges() {
  if (!CSS.supports('mix-blend-mode','plus-lighter')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const directions = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const icons = document.querySelectorAll('.logo-full,.phone-icon,.location svg,.season svg,#date-open svg');
  const updateOffsets = Array.from(icons,(svg,index) => {
    const geometry = document.createElementNS(ns,'g');
    geometry.id = 'olivia-edge-shape-' + index;
    geometry.append(...Array.from(svg.children).filter(node => node.localName !== 'defs'));
    const defs = document.createElementNS(ns,'defs');
    defs.append(geometry);
    const group = document.createElementNS(ns,'g');
    group.style.isolation = 'isolate';
    const samples = directions.map(() => {
      const sample = document.createElementNS(ns,'use');
      sample.setAttribute('href','#' + geometry.id);
      sample.setAttribute('opacity','.25');
      sample.style.mixBlendMode = 'plus-lighter';
      group.append(sample);
      return sample;
    });
    svg.append(defs,group);
    return () => {
      const width = svg.getBoundingClientRect().width;
      if (!width) return;
      const pixels = width * devicePixelRatio * (window.visualViewport?.scale || 1);
      const offset = .22 * svg.viewBox.baseVal.width / pixels;
      samples.forEach((sample,i) => {
        sample.setAttribute('x',directions[i][0] * offset);
        sample.setAttribute('y',directions[i][1] * offset);
      });
    };
  });
  const update = () => updateOffsets.forEach(refresh => refresh());
  update();
  window.addEventListener('resize',update);
  window.visualViewport?.addEventListener('resize',update);
}
smoothVectorEdges();
// Keep words intact when the viewport changes; each word rises through its own mask.
function splitText(element) {
  for (const node of [...element.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const parts = node.textContent.split(/(\s+)/).filter(Boolean);
    node.replaceWith(...parts.map(part => {
      if (!part.trim()) return part;
      const mask = document.createElement('span');
      mask.className = 'word-mask';
      const word = document.createElement('span');
      word.textContent = part;
      mask.append(word);
      return mask;
    }));
  }
  return [...element.querySelectorAll('.word-mask > span')];
}

function rollText(label) {
  const text = label.textContent;
  const link = label.closest('a');
  link.setAttribute('aria-label', label === link ? text : link.textContent.trim());
  const roll = document.createElement('span');
  roll.className = 'roll';
  roll.setAttribute('aria-hidden','true');
  const row = document.createElement('span');
  row.className = 'roll-row';
  Array.from(text).forEach((letter,index) => {
    const glyph = document.createElement('span');
    glyph.textContent = letter;
    glyph.style.setProperty('--i',index);
    row.append(glyph);
  });
  roll.append(row,row.cloneNode(true));
  if (label.matches('.offer b')) {
    // Draw a single, naturally kerned line whenever the letters are at rest.
    const plain = document.createElement('span');
    plain.className = 'offer-label';
    plain.textContent = text;
    label.replaceChildren(plain,roll);
    link.setAttribute('aria-label','Подобрать номер на июнь 2027 года');
    return;
  }
  label.replaceChildren(roll);
}
document.querySelectorAll('header nav a,.phone-number,.side a,.offer b').forEach(rollText);
const tickerTrack = document.querySelector('.ticker-track');
const tickerGroup = document.createElement('span');
tickerGroup.className = 'ticker-group';
for (let repeat = 0; repeat < 3; repeat++) {
  for (const phrase of ['Открытие в июне 2027','До встречи у моря']) {
    const item = document.createElement('span');
    item.textContent = phrase;
    tickerGroup.append(item);
  }
}
tickerTrack.append(tickerGroup,tickerGroup.cloneNode(true));

const header = document.querySelector('header');
let lastHeaderY = 0;
function updateHeader(y) {
  if (y <= 2) {
    header.classList.remove('returning','away');
    lastHeaderY = 0;
    return;
  }
  if (Math.abs(y - lastHeaderY) < 5) return;
  if (y < lastHeaderY) {
    header.classList.add('returning');
    header.classList.remove('away');
  } else {
    header.classList.add('away');
  }
  lastHeaderY = y;
}
for (const button of document.querySelectorAll('.pill,.submit')) {
  const label = button.querySelector('b') || button;
  const text = label.textContent.trim();
  const mask = document.createElement('b');
  mask.className = 'button-words';
  mask.setAttribute('aria-hidden','true');
  for (let i=0;i<2;i++) {
    const row = document.createElement('i');
    row.textContent = text;
    mask.append(row);
  }
  button.setAttribute('aria-label',text);
  if (label === button) button.replaceChildren(mask);
  else label.replaceWith(mask);
}
const textEntrances = [...document.querySelectorAll('.story h2,.facility-list h3,.facility-list li,.season p,.sheet h2')].map(element => ({
  element, words:splitText(element)
}));
const artwork = [...document.querySelectorAll('.restaurant,.pool,.sheet')];
function revealProgress(rect) {
  return clamp((innerHeight * .98 - rect.top) / (innerHeight * .32));
}
function drawEntrances(travel, distance) {
  for (const {element,words} of textEntrances) {
    const rect = element.getBoundingClientRect();
    const progress = still.matches ? 1 : horizontal() && element.closest('.story')
      ? clamp((travel - rect.left) / (travel * .48)) : revealProgress(rect);
    words.forEach((word,index) => {
      const phase = clamp(progress * 1.35 - .35 * index / Math.max(1,words.length - 1));
      word.style.transform = 'translateY(' + ((1 - phase) ** 2 * 125) + '%)';
    });
  }
  for (const node of artwork) {
    const rect = node.getBoundingClientRect();
    const progress = still.matches || node.contains(document.activeElement) ? 1 : revealProgress(rect);
    node.style.clipPath = progress === 1 ? 'none' : 'inset(0 0 ' + ((1-progress)*100) + '% 0)';
    if (!node.matches('figure')) continue;
    const isPool = node.matches('.pool');
    // The section remains pinned under booking. Include that travel in the parallax.
    const sectionPhase = horizontal()
      ? clamp((distance - opening.offsetHeight + innerHeight) / (2 * innerHeight))
      : clamp((innerHeight - rect.top) / (innerHeight + rect.height));
    const offset = still.matches ? 0 : (sectionPhase - .5) * (isPool ? -16 : 12);
    node.style.setProperty('--photo-y',offset + '%');
    node.style.setProperty('--image-scale',still.matches ? 1 : 1.18 + (1-progress)*.32);
  }
}
function enterHeroText() {
  if (still.matches) return;
  for (const element of card.querySelectorAll('h1,#intro')) {
    const words = splitText(element);
    words.forEach((word,index) => word.animate(
      [{transform:'translateY(125%)'},{transform:'translateY(0)'}],
      {duration:750,delay:index*35,easing:'cubic-bezier(.2,.78,.2,1)',fill:'backwards'}
    ));
  }
}
let framePending = false;
let inHero = true;
const offer = document.querySelector('.offer.first');
const offerHome = offer.parentElement;
const offerPhoto = offer.querySelector('img');
function sizeOfferPhoto() {
  // object-fit:cover scales the square source to the longer side, including at pinch zoom.
  const side = Math.max(offerPhoto.clientWidth,offerPhoto.clientHeight);
  if (side) offerPhoto.sizes = Math.ceil(side * (window.visualViewport?.scale || 1)) + 'px';
}
new ResizeObserver(sizeOfferPhoto).observe(offerPhoto);
window.visualViewport?.addEventListener('resize',sizeOfferPhoto);
function horizontal() { return desktop.matches && !still.matches; }
let scroller;
function configureScroll() {
  const parent = horizontal() ? screen : offerHome;
  if (offer.parentElement !== parent) parent.append(offer);
  scroller?.destroy();
  scroller = horizontal() && window.Lenis ? new Lenis({
    autoRaf:true, smoothWheel:true, duration:1.1, prevent:node => node.tagName === 'DIALOG' || node.hasAttribute('data-lenis-prevent')
  }) : null;
  requestDraw();
}
function draw() {
  framePending = false;
  const travel = screen.clientWidth;
  const distance = -opening.getBoundingClientRect().top;
  const pinnedDistance = horizontal() ? opening.offsetHeight - screen.offsetHeight : 0;
  updateHeader(Math.max(0,distance - pinnedDistance));
  if (horizontal()) {
    const progress = clamp(distance / travel);
    track.style.setProperty('--track-x', -progress * travel + 'px');
    // Paint the card independently of the moving panorama at its Figma position.
    const x = travel * (1363 + progress * (624 - 1920)) / 1920;
    offer.style.setProperty('--offer-left',Math.round(x * devicePixelRatio) / devicePixelRatio + 'px');
    const waveProgress = clamp(distance / (travel * .16));
    const waveOffset = Math.min(32, travel / 60) * (1 - (1 - waveProgress) ** 3);
    track.style.setProperty('--wave-x', waveOffset + 'px');
    const settle = clamp((distance - travel) / (screen.clientHeight * .24));
    stats.style.setProperty('--stat-step', settle * travel * 50 / 1920 + 'px');
  } else {
    offer.style.removeProperty('--offer-left');
    track.style.removeProperty('--wave-x');
  }
  drawEntrances(travel,distance);
  const box = card.getBoundingClientRect();
  const visible = box.right > travel * .12 && box.bottom > 0 && box.top < innerHeight;
  if (visible !== inHero) { inHero = visible; scheduleSlide(); }
}
function requestDraw() {
  if (!framePending) { framePending = true; requestAnimationFrame(draw); }
}
window.addEventListener('scroll', requestDraw, {passive:true});
window.addEventListener('resize', requestDraw);
desktop.addEventListener('change', configureScroll);

function jump(id, smooth) {
  const target = document.getElementById(id);
  if (!target) return;
  let top = target.getBoundingClientRect().top + scrollY;
  if (horizontal()) {
    if (id === 'about') top = opening.offsetTop + screen.clientWidth;
    if (id === 'offers' || id === 'top') top = opening.offsetTop;
    if (amenities.contains(target)) top = opening.offsetHeight;
  }
  if (scroller) scroller.scrollTo(top,{immediate:!smooth});
  else window.scrollTo({top,behavior:smooth && !still.matches ? 'smooth' : 'instant'});
}
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (link.closest('.side') && !link.matches('.text-link')) {
    for (const tab of document.querySelectorAll('.side a:not(.text-link)')) {
      tab.classList.toggle('current',tab === link);
      if (tab === link) tab.setAttribute('aria-current','location');
      else tab.removeAttribute('aria-current');
    }
  }
  e.preventDefault();
  if (location.hash !== link.hash) history.pushState(null,'',link.hash);
  jump(link.hash.slice(1),true);
});
window.addEventListener('hashchange', () => jump(location.hash.slice(1) || 'top',false));
window.addEventListener('load', () => { if (location.hash) jump(location.hash.slice(1),false); requestDraw(); });
const slides = [
  ['Анапа, первая береговая линия',['Alean','Family Olivia'],document.querySelector('#intro').textContent],
  ['От 34 до 108 м²',['Номера с видом','на Чёрное море'],'Море видно из каждого номера'],
  ['Под разный возраст',['Для детей','и подростков'],'Детские клубы, творческие занятия и спортивные программы']
];
const photos = [...document.querySelectorAll('.slide')];
const next = document.querySelector('#next');
const indicator = document.querySelector('.rail i');
let slide = 0, timer;
function scheduleSlide() {
  if (!timer) {
    timer = indicator.animate([{transform:'scaleY(.1035)'},{transform:'scaleY(1)'}],
      {duration:6000,fill:'both',easing:'linear'});
    timer.onfinish = advance;
  }
  if (!inHero || document.hidden || still.matches) timer.pause();
  else timer.play();
}
function advance() {
  timer?.cancel();
  timer = null;
  slide = (slide + 1) % photos.length;
  photos.forEach((photo,index) => {
    photo.classList.toggle('active',index === slide);
    photo.setAttribute('aria-hidden', String(index !== slide));
  });
  const [place,lines,copy] = slides[slide];
  const title = card.querySelector('h1');
  title.replaceChildren(lines[0],document.createElement('br'),lines[1]);
  document.querySelector('#place').textContent = place;
  document.querySelector('#intro').textContent = copy;
  next.textContent = (slide + 1) + '/3';
  enterHeroText();
  scheduleSlide();
}
next.addEventListener('click',advance);
document.addEventListener('visibilitychange',scheduleSlide);
still.addEventListener('change',() => { scheduleSlide(); configureScroll(); });
enterHeroText();
if (!still.matches) {
  for (const node of [card,document.querySelector('.offer')])
    node.animate([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],
      {duration:750,easing:'cubic-bezier(.25,.7,.25,1)'});
}
configureScroll(); draw(); scheduleSlide();
