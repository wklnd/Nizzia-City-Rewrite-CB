const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
    player: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Player', 
        required: true 
    },

    // Hur mycket spelaren har satt in
    depositedAmount: { 
        type: Number, 
        required: true, 
        min: 1,
        max: 2000000000
    },
    // Hur länge pengarna är låsta
    period: { 
        type: String, 
        enum: ['1w', '2w', '1m', '3m', '6m'], 
        required: true 
    },

    // Ränta för denna insättning (t.ex. 0.05 = 5%)
    interestRate: { 
        type: Number, 
        required: true 
    },

    // När insättningen gjordes
    startDate: { 
        type: Date, 
        default: Date.now 
    },

    // När spelaren kan ta ut pengarna
    endDate: { 
        type: Date, 
        required: true 
    },

    // Om spelaren redan tagit ut pengarna
    isWithdrawn: { 
        type: Boolean, 
        default: false 
    }
});

module.exports = mongoose.model('BankAccount', bankSchema);
