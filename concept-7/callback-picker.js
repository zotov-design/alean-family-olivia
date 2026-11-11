let activeField, activeMenu;
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
  const width = Math.min(innerWidth - 16, Math.max(rect.width, 255));
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
  const label = field.querySelector(".field-value > span");
  if (label.hasAttribute("data-roll")) {
    renderRoll(label, value);
    field.setAttribute("aria-label", field.querySelector(".field-label").textContent + ", " + value);
  } else label.textContent = value;
  field.classList.add("filled");
}
function openMenu(field) {
  if (activeField === field) { closeMenu(true); return; }
  closeMenu(false);
  activeField = field;
  activeMenu = document.getElementById(field.getAttribute("aria-controls"));
  field.setAttribute("aria-expanded","true");
  activeMenu.showPopover();
  positionMenu();
  const first = activeMenu.querySelector('[aria-pressed="true"],input:checked') || activeMenu.querySelector("button");
  first.focus({preventScroll:true});
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
