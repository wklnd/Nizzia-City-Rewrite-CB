// ═══════════════════════════════════════════════════════════════
//  NPC Personality Archetypes
//  Each personality defines participation weights for every activity.
//  Higher weight = more likely to participate in that activity per tick.
//  Weights are 0.0 to 1.0 (probability per tick).
// ═══════════════════════════════════════════════════════════════

const PERSONALITIES = {
  hustler: {
    id: 'hustler',
    name: 'Street Hustler',
    description: 'Lives for crime and quick cash. Always burning nerve.',
    weights: {
      crime:      0.95,   // almost always committing crimes
      drugs:      0.80,   // heavy drug dealer
      stocks:     0.15,   // rarely invests
      gym:        0.30,   // stays in shape
      bank:       0.10,   // doesn't save
      work:       0.40,   // works sometimes
      education:  0.10,   // barely studies
      casino:     0.05,   // doesn't gamble much
      realEstate: 0.20,   // buys properties opportunistically
      business:   0.15,   // might own a business
      pets:       0.10,   // not interested
      market:     0.40,   // sells loot on market
      cartel:     0.70,   // deep in cartel life
      items:      0.50,   // uses drugs/boosters
    },
  },

  businessman: {
    id: 'businessman',
    name: 'Business Mogul',
    description: 'All about investments, properties, and passive income.',
    weights: {
      crime:      0.10,
      drugs:      0.10,
      stocks:     0.80,   // heavy investor
      gym:        0.20,
      bank:       0.60,   // saves aggressively
      work:       0.90,   // always works
      education:  0.70,   // studies for work stat boosts
      casino:     0.05,
      realEstate: 0.90,   // buys everything
      business:   0.95,   // core activity
      pets:       0.30,
      market:     0.50,   // trades items
      cartel:     0.10,   // stays clean
      items:      0.20,
    },
  },

  gambler: {
    id: 'gambler',
    name: 'High Roller',
    description: 'Loves risk. Spins every wheel, plays the market.',
    weights: {
      crime:      0.30,
      drugs:      0.20,
      stocks:     0.70,   // speculative trader
      gym:        0.15,
      bank:       0.20,
      work:       0.50,
      education:  0.20,
      casino:     0.90,   // spins every wheel they can
      realEstate: 0.40,
      business:   0.30,
      pets:       0.20,
      market:     0.60,   // loves trading
      cartel:     0.20,
      items:      0.30,
    },
  },

  soldier: {
    id: 'soldier',
    name: 'Enforcer',
    description: 'Gym rat and cartel muscle. Fights and trains.',
    weights: {
      crime:      0.60,
      drugs:      0.40,
      stocks:     0.10,
      gym:        0.95,   // always training
      bank:       0.15,
      work:       0.60,
      education:  0.40,   // combat/self-defense courses
      casino:     0.05,
      realEstate: 0.30,
      business:   0.10,
      pets:       0.40,   // gets a pet
      market:     0.30,
      cartel:     0.85,   // cartel enforcer
      items:      0.70,   // uses boosters/drugs for stats
    },
  },

  academic: {
    id: 'academic',
    name: 'Scholar',
    description: 'Pursues education and steady career advancement.',
    weights: {
      crime:      0.05,
      drugs:      0.05,
      stocks:     0.40,
      gym:        0.25,
      bank:       0.50,
      work:       0.95,   // career focused
      education:  0.95,   // always studying
      casino:     0.02,
      realEstate: 0.50,
      business:   0.40,
      pets:       0.30,
      market:     0.20,
      cartel:     0.05,   // stays clean
      items:      0.15,
    },
  },

  dealer: {
    id: 'dealer',
    name: 'Drug Lord',
    description: 'Runs the grow operation and cartel empire.',
    weights: {
      crime:      0.50,
      drugs:      0.95,   // always growing/selling
      stocks:     0.20,
      gym:        0.20,
      bank:       0.30,
      work:       0.30,
      education:  0.15,
      casino:     0.10,
      realEstate: 0.40,
      business:   0.20,
      pets:       0.15,
      market:     0.60,   // sells drugs/items
      cartel:     0.90,   // runs cartel ops
      items:      0.40,
    },
  },

  allrounder: {
    id: 'allrounder',
    name: 'Jack of All Trades',
    description: 'Does a bit of everything. No specialization.',
    weights: {
      crime:      0.50,
      drugs:      0.40,
      stocks:     0.35,
      gym:        0.35,
      bank:       0.25,
      work:       0.70,
      education:  0.40,
      casino:     0.15,
      realEstate: 0.40,
      business:   0.35,
      pets:       0.25,
      market:     0.35,
      cartel:     0.35,
      items:      0.35,
    },
  },
};

// Distribution: how many NPCs get each personality (weights, summed)
const DISTRIBUTION = {
  hustler:     25,
  businessman: 15,
  gambler:      8,
  soldier:     20,
  academic:    10,
  dealer:      12,
  allrounder:  10,
};

/** Pick a random personality based on distribution weights */
function rollPersonality() {
  const entries = Object.entries(DISTRIBUTION);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return 'allrounder';
}

/** Check if an NPC should participate in an activity this tick */
function shouldAct(personality, activity) {
  const p = PERSONALITIES[personality] || PERSONALITIES.allrounder;
  const weight = p.weights[activity] || 0.25;
  return Math.random() < weight;
}

module.exports = { PERSONALITIES, DISTRIBUTION, rollPersonality, shouldAct };
