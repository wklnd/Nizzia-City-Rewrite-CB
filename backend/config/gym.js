// Gym catalog configuration
// Each gym defines: id, name, unlockCost, energyPerTrain, gains per stat, and optional estimate to next

const GYMS = [
  // Light-Weight Gyms (energy per train: 5)
  { id: 1,  tier: 'Light',  name: 'Premier Fitness',     unlockCost: 10,          energyPerTrain: 5, gains: { strength: 2.0, speed: 2.0, defense: 2.0, dexterity: 2.0 }, estEnergyNext: 200 },
  { id: 2,  tier: 'Light',  name: "Average Joes",        unlockCost: 100,         energyPerTrain: 5, gains: { strength: 2.4, speed: 2.4, defense: 2.7, dexterity: 2.4 }, estEnergyNext: 500 },
  { id: 3,  tier: 'Light',  name: "Woody's Workout",     unlockCost: 250,         energyPerTrain: 5, gains: { strength: 2.7, speed: 3.2, defense: 3.0, dexterity: 2.7 }, estEnergyNext: 1000 },
  { id: 4,  tier: 'Light',  name: 'Beach Bods',           unlockCost: 500,         energyPerTrain: 5, gains: { strength: 3.2, speed: 3.2, defense: 3.2, dexterity: null }, estEnergyNext: 2000 },
  { id: 5,  tier: 'Light',  name: 'Silver Gym',           unlockCost: 1000,        energyPerTrain: 5, gains: { strength: 3.4, speed: 3.6, defense: 3.4, dexterity: 3.2 }, estEnergyNext: 2750 },
  { id: 6,  tier: 'Light',  name: 'Pour Femme',           unlockCost: 2500,        energyPerTrain: 5, gains: { strength: 3.4, speed: 3.6, defense: 3.6, dexterity: 3.8 }, estEnergyNext: 3000 },
  { id: 7,  tier: 'Light',  name: 'Davies Den',           unlockCost: 5000,        energyPerTrain: 5, gains: { strength: 3.7, speed: null, defense: 3.7, dexterity: 3.7 }, estEnergyNext: 3500 },
  { id: 8,  tier: 'Light',  name: 'Global Gym',           unlockCost: 10000,       energyPerTrain: 5, gains: { strength: 4.0, speed: 4.0, defense: 4.0, dexterity: 4.0 }, estEnergyNext: 4000 },

  // Middle-Weight Gyms (energy per train: 10)
  { id: 9,  tier: 'Middle', name: 'Knuckle Heads',        unlockCost: 50000,       energyPerTrain: 10, gains: { strength: 4.8, speed: 4.4, defense: 4.0, dexterity: 4.2 }, estEnergyNext: 6000 },
  { id: 10, tier: 'Middle', name: 'Pioneer Fitness',      unlockCost: 100000,      energyPerTrain: 10, gains: { strength: 4.4, speed: 4.6, defense: 4.8, dexterity: 4.4 }, estEnergyNext: 7000 },
  { id: 11, tier: 'Middle', name: 'Anabolic Anomalies',    unlockCost: 250000,      energyPerTrain: 10, gains: { strength: 5.0, speed: 4.6, defense: 5.2, dexterity: 4.6 }, estEnergyNext: 8000 },
  { id: 12, tier: 'Middle', name: 'Core',                 unlockCost: 500000,      energyPerTrain: 10, gains: { strength: 5.0, speed: 5.2, defense: 5.0, dexterity: 5.0 }, estEnergyNext: 11000 },
  { id: 13, tier: 'Middle', name: 'Racing Fitness',       unlockCost: 1000000,     energyPerTrain: 10, gains: { strength: 5.0, speed: 5.4, defense: 4.8, dexterity: 5.2 }, estEnergyNext: 12420 },
  { id: 14, tier: 'Middle', name: 'Complete Cardio',      unlockCost: 2000000,     energyPerTrain: 10, gains: { strength: 5.5, speed: 5.7, defense: 5.5, dexterity: 5.2 }, estEnergyNext: 18000 },
  { id: 15, tier: 'Middle', name: 'Legs, Bums and Tums',  unlockCost: 3000000,     energyPerTrain: 10, gains: { strength: null, speed: 5.5, defense: 5.5, dexterity: 5.7 }, estEnergyNext: 18100 },
  { id: 16, tier: 'Middle', name: 'Deep Burn',            unlockCost: 5000000,     energyPerTrain: 10, gains: { strength: 6.0, speed: 6.0, defense: 6.0, dexterity: 6.0 }, estEnergyNext: 24140 },

  // Heavy-Weight Gyms (energy per train: 10)
  { id: 17, tier: 'Heavy',  name: 'Apollo Gym',           unlockCost: 7500000,     energyPerTrain: 10, gains: { strength: 6.0, speed: 6.2, defense: 6.4, dexterity: 6.2 }, estEnergyNext: 31260 },
  { id: 18, tier: 'Heavy',  name: 'Gun Shop',             unlockCost: 10000000,    energyPerTrain: 10, gains: { strength: 6.5, speed: 6.4, defense: 6.2, dexterity: 6.2 }, estEnergyNext: 36610 },
  { id: 19, tier: 'Heavy',  name: 'Force Training',       unlockCost: 15000000,    energyPerTrain: 10, gains: { strength: 6.4, speed: 6.5, defense: 6.4, dexterity: 6.8 }, estEnergyNext: 46640 },
  { id: 20, tier: 'Heavy',  name: "Cha Cha's",           unlockCost: 20000000,    energyPerTrain: 10, gains: { strength: 6.4, speed: 6.4, defense: 6.8, dexterity: 7.0 }, estEnergyNext: 56520 },
  { id: 21, tier: 'Heavy',  name: 'Atlas',                unlockCost: 30000000,    energyPerTrain: 10, gains: { strength: 7.0, speed: 6.4, defense: 6.4, dexterity: 6.5 }, estEnergyNext: 67775 },
  { id: 22, tier: 'Heavy',  name: 'Last Round',           unlockCost: 50000000,    energyPerTrain: 10, gains: { strength: 6.8, speed: 6.5, defense: 7.0, dexterity: 6.5 }, estEnergyNext: 84535 },
  { id: 23, tier: 'Heavy',  name: 'The Edge',             unlockCost: 75000000,    energyPerTrain: 10, gains: { strength: 6.8, speed: 7.0, defense: 7.0, dexterity: 6.8 }, estEnergyNext: 106305 },
];

function getGymById(id){
  return GYMS.find(g => g.id === Number(id));
}

module.exports = { GYMS, getGymById };
