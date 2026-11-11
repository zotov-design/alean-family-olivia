const fields = document.querySelector(".booking-fields");
const hotelMenu = document.querySelector("#hotels");
const calendar = document.querySelector("#dates");
const bookingDateField = fields.querySelector('[aria-controls="dates"]');
const guestMenu = document.querySelector("#guests");
const monthTitle = new Intl.DateTimeFormat("ru", {month:"long", year:"numeric"});
const fullDate = new Intl.DateTimeFormat("ru", {day:"numeric", month:"long", year:"numeric"});
const shortDate = new Intl.DateTimeFormat("ru", {day:"2-digit", month:"2-digit", year:"2-digit"});
const guests = {adults:2, children:0};
let arrival, departure;
let draftArrival, month, activeField, activeMenu;

for (const field of document.querySelectorAll(".promo")) {
  const input = field.querySelector("input");
  const mirror = field.querySelector(".promo-roll");
  let lastText;
  function syncRoll() {
    const text = input.value || input.placeholder;
    if (text !== lastText) {
      renderRoll(mirror, text);
      lastText = text;
    }
    field.classList.toggle("filled", Boolean(input.value));
  }
  syncRoll();
  field.classList.add("with-roll");
  input.addEventListener("blur", syncRoll);
  field.addEventListener("pointerenter", syncRoll);
  window.addEventListener("pageshow", syncRoll);
}

function positionMenu() {
  if (!activeMenu) return;
  const rect = activeField.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top >= innerHeight) { closeMenu(false); return; }
  const gap = Math.max(7, Math.min(14, rect.width * .038));
  const anchorWidth = activeMenu === calendar ? bookingDateField.getBoundingClientRect().width : rect.width;
  const minWidth = activeMenu === calendar ? 380 : activeMenu === hotelMenu ? 180 : 255;
  const width = Math.min(innerWidth - 16, Math.max(anchorWidth, minWidth));
  activeMenu.style.width = width + "px";
  activeMenu.style.maxHeight = "none";
  const height = activeMenu.offsetHeight;
  const below = innerHeight - rect.bottom - gap - 8;
  const above = rect.top - gap - 8;
  if (activeMenu === calendar && height > Math.max(above, below)) {
    activeMenu.style.maxHeight = (innerHeight - 16) + "px";
    activeMenu.style.left = ((innerWidth - width) / 2) + "px";
    activeMenu.style.top = Math.max(8, (innerHeight - height) / 2) + "px";
    return;
  }
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
  const label = field.querySelector(".field-value > span");
  if (label.hasAttribute("data-roll")) {
    renderRoll(label, value);
    field.setAttribute("aria-label", field.querySelector(".field-label").textContent + ", " + value);
  } else label.textContent = value;
  field.classList.add("filled");
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
const dateTriggers = document.querySelectorAll("[data-date-trigger]");
for (const trigger of dateTriggers) {
  trigger.addEventListener("click", () => openMenu(trigger));
}
function bindOptionMenu(menu, onSelect) {
  menu.addEventListener("click", event => {
    const option = event.target.closest("button");
    if (!option || activeMenu !== menu) return;
    for (const item of menu.children) item.setAttribute("aria-pressed", String(item === option));
    const value = option.textContent;
    setValue(activeField, value);
    onSelect?.(value);
    closeMenu(true);
  });
}
bindOptionMenu(hotelMenu);
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
  const range = shortDate.format(arrival) + "-" + shortDate.format(departure);
  setValue(bookingDateField, range);
  for (const trigger of dateTriggers) {
    trigger.setAttribute("aria-label", "Выбрать даты, " + range);
  }
  closeMenu(true);
});
for (const group of guestMenu.querySelectorAll(".guest-choices")) {
  const name = group.dataset.group;
  const values = name === "adults" ? ["1","2","3","4","5","6+"] : ["0","1","2","3"];
  for (const value of values) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.checked = value === String(guests[name]);
    const chip = document.createElement("span");
    chip.textContent = value === "0" ? "Без детей" : value;
    label.append(input, chip);
    group.append(label);
  }
}
const plural = new Intl.PluralRules("ru");
function countLabel(n, one, few, many) {
  return n + " " + ({one,few,many}[plural.select(n)] || many);
}
function updateGuests(event) {
  const input = event.target;
  guests[input.name] = input.value === "6+" ? input.value : Number(input.value);
  const adults = guests.adults === "6+" ? "6+ взрослых" : countLabel(guests.adults,"взрослый","взрослых","взрослых");
  setValue(activeField,adults + ", " +
    countLabel(guests.children,"ребёнок","ребёнка","детей"));
}
guestMenu.addEventListener("change",updateGuests);
// Clicking a preselected chip is also an explicit first selection.
guestMenu.addEventListener("click",event => {
  if (event.target.matches("input") && !activeField.classList.contains("filled")) updateGuests(event);
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
