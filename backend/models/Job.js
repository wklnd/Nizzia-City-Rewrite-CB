const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({

});

const Job = mongoose.model('Job', JobSchema);

module.exports = Job;