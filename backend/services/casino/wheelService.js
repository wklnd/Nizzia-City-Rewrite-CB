const wheelSettings = require("../../config/casino");

function wheelReward(wheel){  
  const rewards = wheelSettings[wheel].rewards;
  const totalChance = rewards.reduce((acc, reward) => acc + reward.chance, 0);
  const randomChance = Math.random() * totalChance;

  let cumulativeChance = 0;
  for (const reward of rewards) {
    cumulativeChance += reward.chance;
    if (randomChance < cumulativeChance) {
      return reward;
    }
  }
  return null; // This should never happen if the chances are set up correctly
}