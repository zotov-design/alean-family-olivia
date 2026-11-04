const bookingForm = document.querySelector('.sheet form');
const result = document.querySelector('#result');
const fields = bookingForm.querySelector('.fields');
const hotelMenu = document.querySelector('#hotels');
const calendar = document.querySelector('#dates');
const monthTitle = new Intl.DateTimeFormat("ru", {month:"long", year:"numeric"});
const fullDate = new Intl.DateTimeFormat("ru", {day:"numeric", month:"long", year:"numeric"});
const shortDate = new Intl.DateTimeFormat("ru", {day:"2-digit", month:"2-digit", year:"2-digit"});
let arrival = new Date(2026,10,2), departure = new Date(2026,10,8);
let draftArrival, month, activeField, activeMenu;
function positionMenu() {
  if (!activeMenu) return;
  const rect = activeField.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top >= innerHeight) { closeMenu(false); return; }
  const gap = Math.max(7, Math.min(14, rect.width * .038));
  const width = Math.min(innerWidth - 16, Math.max(rect.width, activeMenu === hotelMenu ? 180 : 255));
  activeMenu.style.width = width + "px";
  activeMenu.style.maxHeight = "none";
  const height = activeMenu.offsetHeight;
  const below = innerHeight - rect.bottom - gap - 8;
  const above = rect.top - gap - 8;
  const flip = height > below && above > below;
  const available = Math.max(32, flip ? above : below);
  activeMenu.style.maxHeight = available + "px";
  activeMenu.style.left = Math.min(Math.max(8, rect.left), innerWidth - width - 8) + "px";
  activeMenu.style.top = (flip ? rect.top - gap - Math.min(height, available) : rect.bottom + gap) + "px";
}
function closeMenu(returnFocus) {
  if (!activeMenu) return;
  const field = activeField;
  activeField.setAttribute("aria-expanded","false");
  activeMenu.hidePopover();
  activeMenu = activeField = null;
  if (returnFocus) field.focus({preventScroll:true});
}
function setValue(field, value) {
  field.querySelector('.field-value > span').textContent = value;
  if (field.getAttribute('aria-controls') === 'hotels') bookingForm.elements.hotel.value = value;
}
function renderCalendar() {
  calendar.querySelector("strong").textContent = monthTitle.format(month);
  calendar.querySelector(".range-hint").textContent = draftArrival ?
    "Заезд " + shortDate.format(draftArrival) + " · Выберите дату выезда" : "Выберите дату заезда";
  const grid = calendar.querySelector(".days");
  grid.replaceChildren();
  const year = month.getFullYear(), index = month.getMonth();
  const length = new Date(year,index + 1,0).getDate();
  for (let day = 1; day <= length; day++) {
    const date = new Date(year,index,day);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.day = day;
    const number = document.createElement("span");
    number.textContent = day;
    button.append(number);
    button.setAttribute("aria-label",fullDate.format(date));
    if (day === 1) button.style.gridColumnStart = (date.getDay()+6)%7+1;
    const endpoint = draftArrival ? +date === +draftArrival : +date === +arrival || +date === +departure;
    button.classList.toggle("endpoint", endpoint);
    button.setAttribute("aria-pressed",String(endpoint));
    button.classList.toggle("in-range", !draftArrival && date > arrival && date < departure);
    button.classList.toggle("range-start", !draftArrival && +date === +arrival);
    button.classList.toggle("range-end", !draftArrival && +date === +departure);
    grid.append(button);
  }
}
function openMenu(field) {
  if (activeField === field) { closeMenu(true); return; }
  closeMenu(false);
  activeField = field;
  activeMenu = document.getElementById(field.getAttribute("aria-controls"));
  if (activeMenu === calendar) {
    draftArrival = null;
    const anchor = arrival || new Date();
    month = new Date(anchor.getFullYear(),anchor.getMonth(),1);
    renderCalendar();
  }
  field.setAttribute("aria-expanded","true");
  activeMenu.showPopover();
  positionMenu();
  const first = activeMenu.querySelector('[aria-pressed="true"],input:checked') || activeMenu.querySelector("button");
  first.focus({preventScroll:true});
}
fields.addEventListener("click",event => {
  const field = event.target.closest("button.field");
  if (field) openMenu(field);
});
hotelMenu.addEventListener("click",event => {
  const option = event.target.closest("button");
  if (!option) return;
  for (const item of hotelMenu.children) item.setAttribute("aria-pressed",String(item === option));
  setValue(activeField,option.textContent);
  closeMenu(true);
});
calendar.addEventListener("click",event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.month) {
    month = new Date(month.getFullYear(),month.getMonth() + Number(button.dataset.month),1);
    renderCalendar();
    positionMenu();
    return;
  }
  const date = new Date(month.getFullYear(),month.getMonth(),Number(button.dataset.day));
  if (!draftArrival || date <= draftArrival) {
    draftArrival = date;
    renderCalendar();
    positionMenu();
    calendar.querySelector(".endpoint").focus({preventScroll:true});
    return;
  }
  arrival = draftArrival;
  departure = date;
  setValue(activeField,shortDate.format(arrival) + "–" + shortDate.format(departure));
  closeMenu(true);
});
document.addEventListener("pointerdown",event => {
  if (activeMenu && !activeMenu.contains(event.target) && !activeField.contains(event.target)) closeMenu(false);
});
document.addEventListener("focusin",event => {
  if (activeMenu && !activeMenu.contains(event.target) && !activeField.contains(event.target)) closeMenu(false);
});
document.addEventListener("keydown",event => {
  if (activeMenu && event.key === "Escape") {event.preventDefault();closeMenu(true);}
});
window.addEventListener("resize",positionMenu);
window.addEventListener("scroll",positionMenu,{passive:true});

for (const group of document.querySelectorAll('.chips')) {
  const adults = group.dataset.name === 'adults';
  for (const n of (adults ? ['1','2','3','4','5','6+'] : ['0','1','2','3'])) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = group.dataset.name; input.value = n;
    input.checked = adults ? n === '2' : n === '0';
    const chip = document.createElement('span');
    chip.textContent = n === '0' ? 'Без детей' : n;
    label.append(input,chip); group.append(label);
  }
}
bookingForm.addEventListener('submit',e => {
  e.preventDefault();
  const data = new FormData(bookingForm);
  result.querySelector('p').textContent = [data.get('hotel'),[arrival,departure].map(date => shortDate.format(date)).join('–'),
    'Взрослых: ' + data.get('adults'),'Детей: ' + data.get('children'),
    data.get('promo').trim() && 'Промокод: ' + data.get('promo').trim()].filter(Boolean).join(' · ');
  result.showModal();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
