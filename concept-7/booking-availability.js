(async () => {
  const template = document.querySelector('#olivia-booking');
  const fallback = document.querySelector('#booking-contact');
  const widget = template.content.firstElementChild;
  const [hotelId] = JSON.parse(widget.getAttribute('available-hotels'));
  try {
    const response = await fetch('booking-data.php?key=hotels');
    if (!response.ok) throw new Error();
    const catalog = await response.json();
    if (!catalog.data.some(city => city.hotels?.some(hotel => hotel.guid === hotelId))) return;
    if (!customElements.get('booking-filters-widget-element')) return;
    template.replaceWith(widget.cloneNode(true));
    fallback.hidden = true;
  } catch {
    fallback.hidden = false;
  }
})();
