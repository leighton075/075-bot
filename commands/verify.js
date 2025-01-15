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
        console.log(`[INFO] Connected to the mySQL database.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your account by adding your user ID and username to the database'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error verifying your account.');
            }

            if (result.length > 0) {
                const existingUsername = result[0].username;

                if (existingUsername !== username) {
                    const updateQuery = 'UPDATE verification SET username = ? WHERE user_id = ?';
                    db.query(updateQuery, [username, userId], (updateErr) => {
                        if (updateErr) {
                            console.error(`[ERROR] Error updating username: ${updateErr}`);
                            return interaction.reply('There was an error updating your username.');
                        }
                        interaction.reply('Your username has been updated in the database.');
                    });
                } else {
                    interaction.reply('Your user ID and username are already in the database.');
                }
            } else {
                const insertQuery = 'INSERT INTO verification (user_id, username) VALUES (?, ?)';
                db.query(insertQuery, [userId, username], (insertErr) => {
                    if (insertErr) {
                        console.error(`[ERROR] Error adding user to the database: ${insertErr}`);
                        return interaction.reply('There was an error adding your account to the database.');
                    }
                    interaction.reply('Your user ID and username have been added to the verification database.');
                });
            }
        });
    },
};
