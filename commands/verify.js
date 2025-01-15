const { SlashCommandBuilder } = require('discord.js');
const mysql = require('mysql2');

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
        console.log(`[INFO] Connected to the mySQL database.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your account by adding your user ID to the database'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const imTheBiggestBird = '1087890340792512603';  
        if (interaction.user.id !== imTheBiggestBird) {
            return interaction.reply("You are not the biggest bird");
        }

        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error verifying your account.');
            }

            if (result.length > 0) {
                interaction.reply('You are already verified or in the database.');
            } else {
                const insertQuery = 'INSERT INTO verification (user_id) VALUES (?)';
                db.query(insertQuery, [userId, 0], (insertErr) => {
                    if (insertErr) {
                        console.error(`[ERROR] Error adding user to the database: ${insertErr}`);
                        return interaction.reply('There was an error adding your account to the database.');
                    }
                    interaction.reply('Your user ID has been added to the verification database. You are now unverified, please get verified.');
                });
            }
        });
    },
};
