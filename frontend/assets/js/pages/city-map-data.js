// City locations configuration for the map
// Coordinates are in percentages relative to the map container (left/top)
(() => {
  const LOCATIONS = [
    // POIs aligned to the SVG landmarks (rough initial placement)
    { id: 'gym', name: 'Gym', icon: '💪', x: 20, y: 74, href: 'gym.html' },
    { id: 'casino', name: 'Casino', icon: '🎰', x: 38, y: 34, href: 'casino.html' },
    { id: 'crimes', name: 'Crimes', icon: '🕵️', x: 68, y: 38, href: 'crimes.html' },
    { id: 'bank', name: 'Bank', icon: '🏦', x: 60, y: 26, href: 'money.html' },
    { id: 'stocks', name: 'Stock Exchange', icon: '📈', x: 80, y: 56, href: 'stocks.html' },
    { id: 'job', name: 'Job Center', icon: '🏢', x: 52, y: 72, href: 'job.html' },

    // Shops scroll to sections below
    { id: 'shop-candy', name: 'Candy Shop', icon: '🍬', x: 24, y: 44, sectionId: '#shop-candy' },
    { id: 'shop-weapons', name: 'Weapons', icon: '🔫', x: 46, y: 20, sectionId: '#shop-weapons' },
    { id: 'shop-bnb', name: 'Bits & Bobs', icon: '🧰', x: 86, y: 76, sectionId: '#shop-bnb' },

    // Not yet implemented destinations
    { id: 'airport', name: 'Airport', icon: '✈️', x: 10, y: 18, href: '#', comingSoon: true },
  ];

  window.NC_CITY_LOCATIONS = LOCATIONS;
})();
