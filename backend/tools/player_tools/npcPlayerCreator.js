// NPC Player Creator
// Usage:
//   node npcPlayerCreator.js -250   # creates 250 NPCs
//   node npcPlayerCreator.js 250    # also supported
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../../config/db');
const User = require('../../models/User');
const Player = require('../../models/Player');
const Counter = require('../../models/Counter');

function RandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
const namePartOne = ['Shadow', 'Arrow', 'The', 'Mr', 'Mrs', 'Dr', 'Captain', 'Iron', 'Silver', 'Dark', 'Ghost', 'Night', 'Fire', 'Ice', 'Steel', 'Thunder', 'Lightning', 'Crimson', 'Golden', 'Silent', 'Swift'];
const namePartTwo = ['Wolf', 'Tiger', 'Eagle', 'Dragon', 'Panther', 'Hawk', 'Lion', 'Fox', 'Bear', 'Viper', 'Raven', 'Falcon', 'Cobra', 'Jaguar', 'Shark', 'Stallion', 'Bull', 'Phoenix', 'Griffin', 'Hydra', 'Legend', 'Ninja', 'Samurai'];

function randomName() {
    const p1 = namePartOne[RandomInt(0, namePartOne.length - 1)];
    const p2 = namePartTwo[RandomInt(0, namePartTwo.length - 1)];
    const number = RandomInt(1, 9999);
    return `${p1} ${p2}${number}`;
}

function slugify(s){
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function getNextPlayerId(){
    const result = await Counter.findOneAndUpdate(
        { name: 'player' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return result.seq;
}

async function createNpc() {
    const name = randomName();
    const email = `npc_${slugify(name)}_${RandomInt(1000,9999)}@npc.local`;
    const passwordPlain = `npc-${RandomInt(100000,999999)}`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    // Create User
    const user = new User({ name, email, password: passwordHash });
    await user.save();

    // Create Player
        const id = await getNextPlayerId();
    const genders = ['Male', 'Female', 'Enby'];
        const player = new Player({
        user: user._id,
        name,
        id,
        gender: genders[RandomInt(0, genders.length - 1)],
            npc: true,
        age: 0,
        level: RandomInt(1, 100),
        exp: -1,
        money: RandomInt(100000, 900000),
        points: RandomInt(0, 50),
        energyStats: { energy: 100, energyMax: 100, energyMaxCap: 150, energyMin: 0 },
        nerveStats: { nerve: 20, nerveMax: 20, nerveMaxCap: 125, nerveMin: 0 },
        happiness: { happy: 100, happyMax: 150, happyMaxCap: 99999, happyMin: 0 },
        battleStats: {
            strength: RandomInt(10, 50000),
            speed: RandomInt(10, 50000),
            dexterity: RandomInt(10, 50000),
            defense: RandomInt(10, 50000),
        },
        workStats: {
            manuallabor: RandomInt(0, 50000),
            intelligence: RandomInt(0, 50000),
            endurance: RandomInt(0, 50000),
            employeEfficiency: RandomInt(0, 50000),
        },
        addiction: 0,
    });
    await player.save();

    return { user, player, passwordPlain };
}

(async function main(){
    const raw = process.argv[2] || '10';
    const m = String(raw).match(/^-?(\d+)$/);
    const count = Math.max(1, parseInt(m ? m[1] : raw, 10));
    try {
        await connectDB();
        const created = [];
        for (let i = 0; i < count; i++) {
            try {
                const res = await createNpc();
                created.push(res);
                console.log(`✓ NPC created: ${res.player.name} (id=${res.player.id}) email=${res.user.email} pass=${res.passwordPlain}`);
            } catch (e) {
                console.error('Failed to create NPC:', e.message);
            }
        }
        console.log(`Done. Created ${created.length}/${count} NPCs.`);
    } catch (err) {
        console.error('Fatal:', err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
})();
