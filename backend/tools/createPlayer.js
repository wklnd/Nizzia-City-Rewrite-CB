const mongoose = require('mongoose');
const Player = require('../models/Player');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/nizziacity", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

  id = Math.floor(Math.random() * 1000000).toString(); // Generate a random ID for the player
  // Check if the ID already exists in the database
  Player.findOne({ id: id })
    .then(existingPlayer => {
      if (existingPlayer) {
        console.log('ID already exists, generating a new one...');
        id = Math.floor(Math.random() * 1000000).toString();
      }
    })
    .catch(err => console.error('Error checking ID:', err));
// Create a new player
const newPlayer = new Player({
  name: 'Test Player' + id,
  gender: 'Male',
  id: id,
  age: 0,
  level: 1,
  exp: 0,
  money: 1000,
  points: 50,
  energyStats: {
    energy: 100,
    energyMax: 100,
    energyMaxCap: 150,
    energyMin: 0,
  },
  nerveStats: {
    nerve: 20,
    nerveMax: 20,
    nerveMaxCap: 125,
    nerveMin: 0,
  },
  happiness: {
    happy: 100,
    happyMax: 150,
    happyMaxCap: 99999,
    happyMin: 0,
  },
  battleStats: {
    strength: 100,
    speed: 100,
    dexterity: 100,
    defense: 100,
  },
  workStats: {
    manuallabor: 50,
    intelligence: 50,
    endurance: 50,
    employeEfficiency: 50,
  },
  addiction: 0,
});

// Save the player to the database
newPlayer.save()
  .then(player => {
    console.log('Player added:', player);
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error adding player:', err);
    mongoose.connection.close();
  });