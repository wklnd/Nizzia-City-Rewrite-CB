const wheelSettings = {
  wheelLame: {
    name: "Wheel of Lame",
    cost: 1000,
    rewards: [
      { type: "money", value: 1, chance: 15 },
      { type: "money", value: 250, chance: 12 },
      { type: "money", value: 500, chance: 10 },
      { type: "money", value: 1500, chance: 6 },
      { type: "money", value: 2000, chance: 3 },
      { type: "item", value: "item_cert_lame", chance: 4 },
      { type: "item", value: "item_plastic_sword", chance: 6 },
      { type: "item", value: "item_candy", chance: 8 },
      { type: "points", value: 1, chance: 10 },
      { type: "points", value: 5, chance: 6 },
      { type: "tokens", value: 5, chance: 6 },
      { type: "effect", value: "face_punch", chance: 4 },
      { type: "special", value: "free_spin", chance: 5 },
      { type: "honor", value: "honor_lame", chance: 3 },
      { type: "special", value: "lose", chance: 10 },
      { type: "item", value: "item_mystery_gift", chance: 1 },
      { type: "item", value: "item_trailer", chance: 0.5 } // @TODO: Fix, this is a property
    ]
  },

  wheelMediocre: {
    name: "Wheel of Mediocre",
    cost: 100000,
    rewards: [
      { type: "money", value: 100000, chance: 10 },
      { type: "money", value: 12500, chance: 12 },
      { type: "money", value: 25000, chance: 10 },
      { type: "money", value: 75000, chance: 6 },
      { type: "item", value: "item_business_class", chance: 3 },
      { type: "item", value: "item_free_tshirt", chance: 5 },
      { type: "item", value: "item_cuddly_toy", chance: 5 },
      { type: "points", value: 1, chance: 8 },
      { type: "points", value: 5, chance: 6 },
      { type: "tokens", value: 10, chance: 6 },
      { type: "effect", value: "choke_hold", chance: 4 },
      { type: "special", value: "free_spin", chance: 5 },
      { type: "honor", value: "honor_mediocre", chance: 3 },
      { type: "special", value: "lose", chance: 10 },
      { type: "item", value: "item_mystery_gift", chance: 1 },
      { type: "item", value: "item_villa", chance: 0.5 } // @TODO: Fix, this is a property
    ]
  },

  wheelAwesome: {
    name: "Wheel of Awesome",
    cost: 500000,
    rewards: [
      { type: "money", value: 250000, chance: 10 },
      { type: "money", value: 500000, chance: 8 },
      { type: "money", value: 1500000, chance: 2 },
      { type: "money", value: 2000000, chance: 1 },
      { type: "item", value: "item_cert_awesome", chance: 5 },
      { type: "item", value: "item_donator_pack", chance: 3 },
      { type: "points", value: 100, chance: 4 },
      { type: "points", value: 25, chance: 6 },
      { type: "points", value: 5, chance: 10 },
      { type: "tokens", value: 25, chance: 7 },
      { type: "effect", value: "kick_to_the_throat", chance: 5 },
      { type: "special", value: "free_spin", chance: 7 },
      { type: "honor", value: "honor_awesome", chance: 2 },
      { type: "special", value: "lose", chance: 15 },
      { type: "item", value: "item_mystery_gift", chance: 1 }, // @TODO: Fix, this is a mystery gift
      { type: "item", value: "item_private_island", chance: 0.5 } // @TODO: Fix, this is a property
    ]
  }
};

module.exports = wheelSettings;
