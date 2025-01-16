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
        try {
            return interaction.reply("https://discord.com/oauth2/authorize?client_id=1290426522519343187");
        } catch (error) {
            return interaction.reply('There was an error trying to send the invite link:', error);
        }
    },
};
