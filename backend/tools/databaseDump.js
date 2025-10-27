// This file is responsible for dumping the database contents to a JSON file
// and restoring from such a file.

const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Item = require('../models/Item');
const Player = require('../models/Player');
const User = require('../models/User');

async function dumpDatabase(filePath) {
    await connectDB();
    const items = await Item.find({});
    const players = await Player.find({});
    const users = await User.find({});

    const dump = {
        items,
        players,
        users
    };

    fs.writeFileSync(filePath, JSON.stringify(dump, null, 2));
    console.log(`Database dumped to ${filePath}`);
    process.exit(0);
}

async function restoreDatabase(filePath) {
    await connectDB();
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    await Item.deleteMany({});
    await Player.deleteMany({});
    await User.deleteMany({});

    await Item.insertMany(data.items);
    await Player.insertMany(data.players);
    await User.insertMany(data.users);

    console.log(`Database restored from ${filePath}`);
    process.exit(0);
}

// Command line interface
const args = process.argv.slice(2);
if (args.length !== 2 || !['dump', 'restore'].includes(args[0])) {
    console.log('Usage: node databaseDump.js <dump|restore> <filePath>');
    process.exit(1);
}

const [action, filePath] = args;

if (action === 'dump') {
    dumpDatabase(filePath);
} else if (action === 'restore') {
    restoreDatabase(filePath);
}   