// Pet catalog (store offerings)
// Designed to be simple now and extensible later (e.g., stat bonuses, minigames hooks)
// id: stable identifier; name: display; cost: purchase price; happyBonus: increases player's happyMax while owned

const PETS = {
  dog: {
    id: 'dog',
    name: 'Dog',
    cost: 15000,
    happyBonus: 15,
    exclusive: false,
  },
  cat: {
    id: 'cat',
    name: 'Cat',
    cost: 12000,
    happyBonus: 12,
    exclusive: false,
  },
  parrot: {
    id: 'parrot',
    name: 'Parrot',
    cost: 18000,
    happyBonus: 18,
    exclusive: false,
  },
  turtle: {
    id: 'turtle',
    name: 'Turtle',
    cost: 8000,
    happyBonus: 8,
    exclusive: false,
  },
  rabbit: {
    id: 'rabbit',
    name: 'Rabbit',
    cost: 10000,
    happyBonus: 10,
    exclusive: false,
  },
  lion: {
    id: 'lion',
    name: 'Lion',
    cost: 5000000,
    happyBonus: 90,
    exclusive: false,
  },
  dodo: {
    id: 'dodo',
    name: 'Dodo Bird',
    cost: 5100000,
    happyBonus: 95,
    exclusive: false,
  },
  hebbe: {
    id: 'hebbe',
    name: 'Hebbe',
    cost: 99999999,
    happyBonus: 999,
    exclusive: true,
  },
};

module.exports = { PETS };
