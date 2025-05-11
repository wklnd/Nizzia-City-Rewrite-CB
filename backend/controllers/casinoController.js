const wheelSettings = require("../config/casino");
const Player = require("../models/Player");

function wheelReward(wheel) {  
  if (!wheelSettings[wheel]) {
    throw new Error(`Invalid wheel type: ${wheel}`);
  }

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

const spinWheel = async (req, res) => {
  try {
    const { userId, wheel } = req.body; // Expecting userId and wheel type in the request body
    if (!userId || !wheel) {
      return res.status(400).json({ error: "User ID and wheel type are required" });
    }

    // Validate wheel type and get its cost
    const wheelConfig = wheelSettings[wheel];
    if (!wheelConfig) {
      return res.status(400).json({ error: "Invalid wheel type" });
    }
    const cost = wheelConfig.cost;

    // Fetch the player using the `id` field instead of `_id`
    const player = await Player.findOne({ id: userId });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Check if the player has enough money
    if (player.money < cost) {
      return res.status(400).json({ error: "Not enough money to spin the wheel" });
    }

    // Deduct the cost from the player's money
    player.money -= cost;
    await player.save();

    // Spin the wheel and determine the reward
    const reward = wheelReward(wheel);

    // Return the reward to the user
    res.json({ reward, remainingMoney: player.money });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { spinWheel };