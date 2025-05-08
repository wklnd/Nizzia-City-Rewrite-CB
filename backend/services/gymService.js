const calculateGain = ({ statTotal, happy, gymDots, energyPerTrain, perkBonus, statType, randomValue }) => {
  const S = Math.min(statTotal, 50000000);
  const H = happy;
  const G = gymDots;
  const E = energyPerTrain;
  const perkBonusFactor = perkBonus / 100;
  const rand = randomValue;

  let A = 0, B = 0, C = 0;
  switch (statType) {
    case 'strength': A = 1600; B = 1700; C = 700; break;
    case 'speed': A = 1600; B = 2000; C = 1350; break;
    case 'dexterity': A = 1800; B = 1500; C = 1000; break;
    case 'defense': A = 2100; B = -600; C = 1500; break;
    default: throw new Error('Invalid stat type');
  }

  const logPart = Math.log(1 + H / 250);
  const gain = (
    (S * (1 + 0.07 * logPart) + 8 * Math.pow(H, 1.05) + (1 - Math.pow(H / 99999, 2)) * A + B + rand)
    / 200000
  ) * G * E * (1 + perkBonusFactor);

  return gain.toFixed(2);
};

module.exports = { calculateGain };