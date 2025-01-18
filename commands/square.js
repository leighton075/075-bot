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
        console.error(`[ERROR] Error connecting to the database in square.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in square.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('square')
        .setDescription('Returns the square of a number.')
        .addIntegerOption(option =>
            option
                .setName('number')
                .setDescription('The number to square')
                .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;

        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], async (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error processing your request.');
            }

            if (result > 0) {
                const number = interaction.options.getInteger('number');
        
                let result = number * number;
                if (number < 0) {
                    result = -result;
                }
        
                await interaction.reply({ content: `The result of squaring ${number} is ${result}.` });
            } else {
                return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
            }
        });
    },
};