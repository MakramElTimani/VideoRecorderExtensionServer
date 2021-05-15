const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    FullName: {
        type: String
    },
    Email:{
        type: String
    },
    Password: {
        type: String
    },
    CreatedOn: {
        type: Date,
        default: Date.now
    },
    Files:{
        type: [String]
    }
});

module.exports = mongoose.model('User', userSchema);