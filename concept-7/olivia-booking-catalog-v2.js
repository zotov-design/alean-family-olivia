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
    if (!hotel) return;
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
