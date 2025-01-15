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
        .setName('unverify')
        .setDescription('Unverify your account and remove it from the verification database'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user in the database: ${err}`);
                    return interaction.reply('There was an error processing your request.');
                }

                if (result.length > 0) {
                    console.log(`[DEBUG] Found user in the database: ${userId}, ${result[0].username}`);

                    const deleteQuery = 'DELETE FROM verification WHERE user_id = ?';
                    db.query(deleteQuery, [userId], (deleteErr) => {
                        if (deleteErr) {
                            console.error(`[ERROR] Error removing user from the database: ${deleteErr}`);
                            return interaction.reply('There was an error removing your account from the database.');
                        }

                        console.log(`[DEBUG] User removed from database: ${userId}, ${result[0].username}`);

                        interaction.reply('Your account has been successfully unverified and removed from the verification database.');
                    });
                } else {
                    console.log(`[DEBUG] User not found in database: ${userId}`);
                    return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
                }
            });
        } catch (error) {
            console.error('Error un-verifying user:', error);
            return interaction.reply({ content: 'There was an error un-verifying your account', ephemeral: true });
        }
    },
};
