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
        console.error(`[ERROR] Error connecting to the database: ${err}`);
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
        const number = interaction.options.getInteger('number');
        
        let result = number * number;
        if (number < 0) {
            result = -result;
        }

        await interaction.reply({ content: `The result of squaring ${number} is ${result}.` });
    },
};