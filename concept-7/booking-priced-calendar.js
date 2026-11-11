(() => {
  const hotelId = '915ce1b1-c25a-11f1-9dee-005056b0742a';
  const hotelField = fields.querySelector('[aria-controls="hotels"]');
  const searchButton = document.querySelector('.search-rooms');
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.hidden = true;
  searchButton.before(status);
  setValue(hotelField, 'Alean Family Olivia');

  function widgetFields(value) {
    if (Array.isArray(value)) return value.map(widgetFields);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), widgetFields(entry)
    ]));
  }

  const opening = new Date(2027, 5, 5);
  let earliest, lastCheckout, blocked;

  function nextDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }

  function canArrive(date) {
    return date && date >= earliest && (!lastCheckout || date < lastCheckout) &&
      !blocked.has(localDate(date));
  }

  function canStay(from, to) {
    if (!canArrive(from) || !to || to <= from || (lastCheckout && to > lastCheckout)) return false;
    for (let night = nextDay(from); night < to; night = nextDay(night)) {
      if (blocked.has(localDate(night))) return false;
    }
    return true;
  }

  function monthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  const tariffs = new Map();
  const rubles = new Intl.NumberFormat('ru-RU', {style:'currency', currency:'RUB', maximumFractionDigits:0, minimumFractionDigits:0});
  let fetchingPrices = false;
  let pricesLoaded = false;
  function showPrices() {
    for (const button of calendar.querySelectorAll('[data-day]')) {
      const day = new Date(month.getFullYear(), month.getMonth(), Number(button.dataset.day));
      const price = tariffs.get(localDate(day));
      if (button.disabled || !price || button.querySelector('.night-rate')) continue;
      const label = document.createElement('small');
      label.className = 'night-rate';
      label.textContent = rubles.format(price);
      button.append(label);
      button.setAttribute('aria-label', fullDate.format(day) + ', ' + label.textContent);
    }
  }
  async function loadPrices() {
    if (fetchingPrices || pricesLoaded) return;
    fetchingPrices = true;
    try {
      const response = await fetch('booking-data.php?key=' + encodeURIComponent(hotelId), {signal:AbortSignal.timeout(10000)});
      if (!response.ok) return;
      const prices = await response.json();
      if (!Array.isArray(prices.data)) return;
      for (const entry of prices.data) {
        if (Number.isFinite(entry.price) && entry.price > 0) tariffs.set(entry.date, entry.price);
      }
      pricesLoaded = true;
      if (activeMenu === calendar) showPrices();
    } catch {
      // Date selection is independent of the price service.
    } finally {
      fetchingPrices = false;
    }
  }

  const drawCalendar = renderCalendar;
  renderCalendar = () => {
    drawCalendar();
    for (const button of calendar.querySelectorAll('[data-day]')) {
      const day = new Date(month.getFullYear(), month.getMonth(), Number(button.dataset.day));
      button.disabled = draftArrival && day > draftArrival ? !canStay(draftArrival, day) : !canArrive(day);
    }
    showPrices();
    loadPrices();
    calendar.querySelector('[data-month="-1"]').disabled = month <= monthStart(earliest);
    calendar.querySelector('[data-month="1"]').disabled = Boolean(lastCheckout && month >= monthStart(lastCheckout));
  };

  function applyAvailability(item) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const catalogStart = item?.dateFrom ? new Date(item.dateFrom + 'T00:00:00') : opening;
    earliest = new Date(Math.max(today, opening, catalogStart));
    lastCheckout = item?.dateTill ? new Date(item.dateTill + 'T00:00:00') : null;
    blocked = new Set(item?.unavailableDatesForCheckIn || []);
    while (blocked.has(localDate(earliest))) earliest = nextDay(earliest);
    if (!canStay(arrival, departure)) {
      arrival = canArrive(earliest) ? earliest : null;
      departure = arrival ? nextDay(arrival) : null;
      const range = arrival ? shortDate.format(arrival) + '–' + shortDate.format(departure) : 'Нет доступных дат';
      setValue(bookingDateField, range);
      for (const trigger of dateTriggers) trigger.setAttribute('aria-label', 'Выбрать даты, ' + range);
    }
    if (activeMenu === calendar) {
      draftArrival = null;
      month = monthStart(arrival || earliest);
      renderCalendar();
      positionMenu();
    }
  }
  applyAvailability(null);

  let hotel;
  async function loadHotel(showError = false) {
    searchButton.disabled = true;
    try {
      const response = await fetch('booking-data.php?key=hotels', {signal: AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error();
      const catalog = await response.json();
      const item = catalog.data.flatMap(city => city.hotels).find(entry => entry.guid === hotelId);
      if (!item) {
        status.hidden = true;
        return;
      }
      hotel = widgetFields(item);
      applyAvailability(hotel);
      setValue(hotelField, hotel.title);
      status.hidden = true;
    } catch {
      status.textContent = 'Не удалось загрузить отель. Нажмите «Найти номер», чтобы повторить.';
      status.hidden = !showError;
    } finally {
      searchButton.disabled = false;
    }
  }
  loadHotel();
  function localDate(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function encode(value) {
    return btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)), byte => String.fromCharCode(byte)).join(''));
  }
  searchButton.addEventListener('click', async () => {
    const retry = !hotel;
    if (retry) await loadHotel(true);
    if (!hotel || !canStay(arrival, departure)) return;
    const url = new URL('https://booking.aleancollection.ru/');
    url.searchParams.set('token', encode({
      selectedHotel: hotel,
      selectedDateFrom: localDate(arrival),
      selectedDateTill: localDate(departure),
      numberOfPersons: Number(guests.adults),
      numberOfChildren: Number(guests.children),
      promocode: fields.querySelector('.promo input').value.trim()
    }));
    url.searchParams.set('data', encode('roistat_visit='));
    if (retry) window.location.assign(url.href);
    else window.open(url.href, '_blank', 'noopener');
  });
})();
