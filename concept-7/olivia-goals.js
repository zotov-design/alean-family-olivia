function trackOliviaGoal(goal) {
  if (typeof window.ym !== 'function') return;
  for (const counter of [114106194, 89824445]) {
    window.ym(counter, 'reachGoal', goal);
  }
}

(() => {
  const menuGoals = new Map([
    ['#rooms', 'menu_rooms'],
    ['#inclusive', 'menu_all_inclusive'],
    ['#children', 'menu_children'],
    ['#season-offer', 'menu_early_booking']
  ]);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    if (link.protocol === 'tel:') {
      trackOliviaGoal('phone_click');
    } else if (link.protocol === 'https:' && ['max.ru', 'www.max.ru'].includes(link.hostname)) {
      trackOliviaGoal('max_click');
    } else if (link.closest('#header-nav, .footer-nav')) {
      const goal = menuGoals.get(link.hash);
      if (goal) trackOliviaGoal(goal);
    }
  });
})();
