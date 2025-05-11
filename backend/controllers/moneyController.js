const Player = require("../models/Player");

const getMoney = async (req, res) => {
  const { userId } = req.body;
  try {
    const player = await Player.findOne({ id: userId }); // Use findOne instead of findById
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json({ money: player.money });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addMoney = async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const player = await Player.findOne({ id: userId }); // Use findOne instead of findById
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    player.money = Number(player.money) + Number(amount);
    await player.save();
    res.json({ money: player.money });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const removeMoney = async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const player = await Player.findOne({ id: userId }); // Use findOne instead of findById
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    if (player.money < amount) {
      return res.status(400).json({ error: "Not enough money" });
    }
    player.money -= amount;
    await player.save();
    res.json({ money: player.money });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const spendMoney = async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const player = await Player.findOne({ id: userId }); // Use findOne instead of findById
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    if (player.money < amount) {
      return res.status(400).json({ error: "Not enough money" });
    }
    player.money -= amount;
    await player.save();
    res.json({ money: player.money });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMoney,
  addMoney,
  removeMoney,
  spendMoney,
};