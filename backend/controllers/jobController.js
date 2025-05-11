const jobSettings = require("../config/job");
const Player = require("../models/Player");

// Function to get hired for a certain job
const hirePlayer = async (req, res) => {
  const { userId, jobId } = req.body;

  try {
    // Find the player in the database
    const player = await Player.findOne({ id: userId }); // Use userId from the request body
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Check if the player is already hired for a job
    if (player.job.jobId) {
      return res.status(400).json({ error: "Player is already hired for a job" });
    }

    // Find the job by its ID
    const job = jobSettings.jobs[jobId];
    if (!job) {
      return res.status(400).json({ error: "Invalid jobId" });
    }

    // Check if the player has enough stats to get hired for the job
    const requiredStats = job.rankZero.requiredStats; // Assuming rankZero is the starting rank
    if (
      player.workStats.manuallabor < requiredStats.manuallabor ||
      player.workStats.intelligence < requiredStats.intelligence ||
      player.workStats.endurance < requiredStats.endurance
    ) {
      return res.status(400).json({ error: "Player does not have enough stats to get hired for this job" });
    }

    // Hire the player for the job
    player.job.jobId = jobId;
    player.job.jobRank = 0;
    player.job.jobPoints = 0;
    await player.save();

    res.json({ message: "Player hired for job", jobId: jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Function to promote a player in their job
const promotePlayer = async (req, res) => {
  const { playerId } = req.body;

  try {
    // Find the player in the database
    const player = await Player.findOne({ id: playerId }); // Use playerId from the request body
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Check if the player is hired for a job
    if (!player.job.jobId) {
      return res.status(400).json({ error: "Player is not hired for a job" });
    }

    // Check if the player has enough job points to get promoted
    const job = jobSettings[player.job.jobId];
    if (player.job.jobPoints < job.pointsForPromotion) {
      return res.status(400).json({ error: "Player does not have enough job points to get promoted" });
    }

    // Check if the player has enough stats to get promoted
    const requiredStats = job.requiredStats;
    if (
      player.workStats.manuallabor < requiredStats.manuallabor ||
      player.workStats.intelligence < requiredStats.intelligence ||
      player.workStats.endurance < requiredStats.endurance
    ) {
      return res.status(400).json({ error: "Player does not have enough stats to get promoted" });
    }

    // Promote the player
    player.job.jobRank += 1;
    player.job.jobPoints -= job.pointsForPromotion; // Deduct points for promotion
    await player.save();

    res.json({ message: "Player promoted", newRank: player.job.jobRank });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Function to leave a job
const leaveJob = async (req, res) => {
  const { playerId } = req.body;

  try {
    // Find the player in the database
    const player = await Player.findOne({ id: playerId }); // Use playerId from the request body
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Check if the player is hired for a job
    if (!player.job.jobId) {
      return res.status(400).json({ error: "Player is not hired for a job" });
    }

    // Leave the job
    player.job.jobId = null;
    player.job.jobRank = 0;
    player.job.jobPoints = 0;
    await player.save();

    res.json({ message: "Player left the job" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { hirePlayer, promotePlayer, leaveJob };