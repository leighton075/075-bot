const { SlashCommandBuilder } = require('discord.js');
const mysql = require('mysql2');

// ==========================
//        mySQL Setup
// ==========================
const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: 'bot_verification'
});

db.connect((err) => {
    if (err) {
        console.error(`[ERROR] Error connecting to the database in ping.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in ping.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s response time'),

    async execute(interaction) {
        const userId = interaction.user.id;
        
        db.query('SELECT verified FROM users WHERE user_id = ?', [userId], (err, results) => {
            if (err) {
                return interaction.reply('There was an error checking your verification status.');
            }

            if (results.length === 0 || !results[0].verified) {
                return interaction.reply('You are not verified. Please complete the verification process.');
            }

            const start = Date.now();
            interaction.reply('Pinging...').then(() => {
                const end = Date.now();
                const ping = end - start;
                interaction.editReply(`pong! ${ping}ms`);
            });
        });
    },
};
