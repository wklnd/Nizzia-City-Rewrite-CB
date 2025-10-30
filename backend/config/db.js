const mongoose = require('mongoose');

require('dotenv').config();

const DEFAULT_URI = 'mongodb://localhost:27017/nizziacity';

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || DEFAULT_URI;
        const conn = await mongoose.connect(uri);
        console.log(`Connected to the database at: ${conn.connection.host}`);
        console.log(`Database name: ${DEFAULT_URI}`);
    } catch (error) {
        console.error(`Mongo connection error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;