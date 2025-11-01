// Define locations first so CRIMES can reference by id safely
const LOCATION = {
  Subway_Station: {
    id: 'subway_station',
    name: 'Subway Station',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 50, max: 200, chance: 70 },
      { type: 'item', value: '0', chance: 20 }, // Placeholder item
      { type: 'item', value: '0', chance: 10 }, // PLACEHOLDER item
      { type: 'item', value: '6', chance: 40 },
      { type: 'item', value: '41', chance: 5 }, // ecstasy
    ],
    CriticalFailChance: 5, 
    CriticalFailEvent: { type: 'injury', severity: 'minor' }, // 20% of hp
    MinorFailChance: 10,
    MinorFailEvent: { type: 'failure' }, // just fail, no reward

    PopularityAt:{ morning: 40, afternoon: 40, evening: 15, night: 5 },


  },
  Trash: {
    id: 'trash',
    name: 'Trash',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 10, max: 20, chance: 70 },
      { type: 'item', value: '0', chance: 30 }, // Placeholder item
      { type: 'item', value: '51', chance: 20 },
      { type: 'item', value: '0', chance: 2 }, // PLACEHOLDER item
      // should be rotten foods, trash, etc. (DRUGS are unlikely but possible)
    ],
    CriticalFailChance: 5, 
    CriticalFailEvent: { type: 'injury', severity: 'minor' }, // 20% of hp
  },
  Junkyard: {
    id: 'junkyard',
    name: 'Junkyard',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 50, max: 200, chance: 70 },
      { type: 'item', value: '0', chance: 20 }, // Placeholder item
      { type: 'item', value: '0', chance: 10 }, // PLACEHOLDER item
      { type: 'item', value: '6', chance: 40 },
      { type: 'item', value: '41', chance: 5 }, // ecstasy
    ],
    CriticalFailChance: 5, 
    CriticalFailEvent: { type: 'injury', severity: 'minor' }, // 20% of hp

    MinorFailChance: 10,
    MinorFailEvent: { type: 'failure' }, // just fail, no reward
  },
};

const CRIMES = {
  search_for_cash: {
    id: 'search_for_cash',
    name: 'Search for Cash',
    // Reference by location id string to avoid circular refs
    location: ['subway_station', 'trash', 'junkyard'],
    nerveCost: 2, 
    expPerSuccess: 10,
    expPerFail: 1,
  },
};

module.exports = { CRIMES, LOCATION };
