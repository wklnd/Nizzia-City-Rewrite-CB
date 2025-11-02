const Mongoose = require('mongoose');

// Each document represents a single owned pet.
// Note: We reference the owning User (not Player) for consistency with other lookups in codebase.
const PetsSchema = new Mongoose.Schema(
    {
        name: { type: String, required: true }, // Display name (e.g., "Buddy")
        type: { type: String, required: true }, // Catalog id/type (e.g., "dog", "cat")
        age: { type: Number, default: 0 }, // Days owned; can be incremented by cron later
        // Bonuses (extensible): currently only happiness max bonus; add more later
        happyBonus: { type: Number, default: 0 },
        petstoreCost: { type: Number, default: 0 },
        // Owner linkage – enforce one pet per user via unique index
    ownerId: { type: Mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // When listed on the market to prevent duplicate sales
    listed: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Ensure at most one pet per owner
try {
    PetsSchema.index({ ownerId: 1 }, { unique: true });
} catch (_) {}

const Pets = Mongoose.model('Pets', PetsSchema);

module.exports = Pets;
