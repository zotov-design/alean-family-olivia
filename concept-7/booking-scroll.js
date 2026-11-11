(() => {
  const dock = document.querySelector('.booking-dock');
  const toggle = dock.querySelector('.dock-toggle');
  const mobile = matchMedia('(max-width:760px)');
  const notice = document.querySelector('.cookie-info');
  const cookieKey = 'alean-olivia-cookie-notice';
  const setExpanded = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Свернуть' : 'Выбрать даты';
  };
  toggle.addEventListener('click', () => {
    if (activeMenu) closeMenu(false);
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  });
  mobile.addEventListener('change', () => setExpanded(false));
  new ResizeObserver(() => document.documentElement.style.setProperty('--dock-height', dock.offsetHeight+'px')).observe(dock);
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-date-trigger]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (activeMenu) closeMenu(false);
    if (mobile.matches) setExpanded(true);
    bookingDateField.focus({preventScroll:true});
    openMenu(bookingDateField);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && toggle.getAttribute('aria-expanded') === 'true') {
      setExpanded(false);
      toggle.focus();
    }
  });
  try { notice.hidden = localStorage.getItem(cookieKey) === '1'; } catch { notice.hidden = false; }
  notice.querySelector('button').addEventListener('click', () => {
    notice.hidden = true;
    try { localStorage.setItem(cookieKey, '1'); } catch {}
  });
})();
