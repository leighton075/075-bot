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
        console.error(`[ERROR] Error connecting to the database in invite.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in invite.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite the bot'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], async (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error processing your request.');
            }

            if (result.length > 0) {
                return interaction.reply("https://discord.com/oauth2/authorize?client_id=1290426522519343187");
            } else {
                return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
            }
        });
    },
};