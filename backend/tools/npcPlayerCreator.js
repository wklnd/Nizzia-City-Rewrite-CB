// Create x amount of npc players that "play" the game for testing purposes
// each npc will randomly perform gym training once every few hours. 

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Player = require('../models/Player');
const Gym = require('../models/Gym');
const User = require('../models/User');

async function createNpcPlayers(numPlayers) {
    await connectDB();

    const gyms = await Gym.find({});
    if (gyms.length === 0) {
        console.error('No gyms found in the database. Please add gyms before creating NPC players.');
        process.exit(1);
    }

    for (let i = 0; i < numPlayers; i++) {
        const username = `npc_player_${Date.now()}_${i}`;
        const user = new User({ username, isNpc: true });
        await user.save();

        const player = new Player({
            user: user._id,
            money: 1000,
            energy: 100,
            nerve: 100,
            happiness: 100,
            inventory: [],
            stats: {
                strength: 10,
                agility: 10,
                intelligence: 10
            }
        });
        await player.save();

        console.log(`Created NPC player: ${username} with ID: ${player._id}`);
    }

    console.log(`Successfully created ${numPlayers} NPC players.`);
    process.exit(0);
}

// Command line interface
const args = process.argv.slice(2);
if (args.length !== 1 || isNaN(parseInt(args[0], 10))) {
    console.log('Usage: node npcPlayerCreator.js <number_of_npc_players>');
    process.exit(1);
}

const numPlayers = parseInt(args[0], 10);
createNpcPlayers(numPlayers);   