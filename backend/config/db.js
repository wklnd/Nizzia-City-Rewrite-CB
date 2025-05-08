const mongoose = require('mongoose');

require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect("mongodb://localhost:27017/nizziacity");
        console.log(`Connected to the database at: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;