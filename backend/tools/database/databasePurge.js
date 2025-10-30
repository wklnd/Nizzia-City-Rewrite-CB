// This script purges the entire db. Be careful. 
// @author Oscar Wiklund Jonsson
// Usage: node backend/tools/databasePurge.js
// @Date 2025-10-29
const { MongoClient } = require("mongodb");
const readline = require("readline");
let chalk = null;
try {
    // chalk@5 is ESM-only; in CommonJS require returns a module namespace with .default
    const mod = require("chalk");
    chalk = mod && mod.default ? mod.default : mod;
} catch (_) {
    // Fallback no-color chalk-like shim
    const id = (x) => x;
    chalk = { yellow: id, green: id, red: id, blue: id, gray: id, bold: { red: id } };
}

async function purgeDatabase() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db("nizziacity");
        await db.dropDatabase();
        console.log(chalk.green("✓ Database 'nizziacity' has been completely dropped."));
    } catch (err) {
        console.error(chalk.red("Error purging database:"), err);
    } finally {
        await client.close();
    }
}

function confirmAndPurge() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = chalk.yellow("Do you really want to purge the 'nizziacity' database? ") +
                     chalk.bold.red("Type 'yes' to confirm: ");

    rl.question(question, async (answer) => {
        if (answer.trim().toLowerCase() === "yes") {
            console.log(chalk.blue("Proceeding with purge..."));
            await purgeDatabase();
        } else {
            console.log(chalk.gray("Operation cancelled."));
        }
        rl.close();
    });
}

confirmAndPurge();
