(() => {
  bookingDateField.querySelector('.field-label').textContent = 'Даты заезда и выезда';
  [...hotelMenu.querySelectorAll('button')].slice(1).forEach(button => { button.hidden = true; });

  const guestField = fields.querySelector('[aria-controls="guests"]');
  const guestCount = () => Number(guests.adults) + Number(guests.children);
  const guestText = () => countLabel(guestCount(), 'гость', 'гостя', 'гостей');
  setValue(guestField, guestText());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  arrival = today;
  departure = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  setValue(bookingDateField, shortDate.format(arrival) + '–' + shortDate.format(departure));

  const counters = [];
  for (const [index, fieldset] of [...guestMenu.querySelectorAll('fieldset')].entries()) {
    const key = index === 0 ? 'adults' : 'children';
    const label = index === 0 ? 'взрослых' : 'детей';
    fieldset.querySelector('.guest-choices').hidden = true;
    const row = document.createElement('div'); row.className = 'guest-counter';
    const hint = document.createElement('span'); hint.className = 'guest-counter__hint';
    hint.textContent = index === 0 ? 'от 15 лет на дату заезда' : 'до 15 лет на дату заезда';
    const controls = document.createElement('div'); controls.className = 'guest-counter__controls';
    const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Уменьшить количество: ' + label);
    const value = document.createElement('span'); value.className = 'guest-counter__value'; value.setAttribute('aria-live', 'polite');
    const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Увеличить количество: ' + label);
    controls.append(minus, value, plus); row.append(hint, controls); fieldset.append(row);
    counters.push({key, minus, value, plus});
    const change = delta => { guests[key] = Number(guests[key]) + delta; render(); };
    minus.addEventListener('click', () => change(-1));
    plus.addEventListener('click', () => change(1));
  }
  function render() {
    counters.forEach(({key, minus, value, plus}) => {
      const n = Number(guests[key]); value.textContent = n;
      minus.disabled = n <= (key === 'adults' ? 1 : 0);
      plus.disabled = guestCount() >= 6 || (key === 'children' && n >= 5);
    });
    setValue(guestField, guestText());
    if (activeMenu === guestMenu) positionMenu();
  }
  render();
  guestMenu.addEventListener('toggle', event => {
    if (event.newState === 'open') {
      guestMenu.querySelector('.guest-counter__controls button:not(:disabled)')?.focus({preventScroll:true});
    }
  });

  const originalRenderCalendar = renderCalendar;
  renderCalendar = () => {
    originalRenderCalendar();
    const limit = new Date(); limit.setHours(0, 0, 0, 0);
    calendar.querySelectorAll('.days button').forEach(button => {
      const day = new Date(month.getFullYear(), month.getMonth(), Number(button.dataset.day));
      button.disabled = day < limit;
    });
    const prev = calendar.querySelector('[data-month="-1"]');
    prev.disabled = month.getFullYear() === limit.getFullYear() && month.getMonth() === limit.getMonth();
  };
})();
