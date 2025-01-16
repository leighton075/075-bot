const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
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
        console.error(`[ERROR] Error connecting to the database in evelyn.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in evelyn.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('evelyn')
        .setDescription('Get a random edit of Evelyn'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], async (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user in the database: ${err}`);
                    return interaction.reply('There was an error processing your request.');
                }

                if (result.length > 0) {
                    await getRandomEvelynEdit(interaction);
                } else {
                    return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
                }
            });
        } catch (error) {
            console.error('[ERROR] Error executing evelyn command:', error);
            return interaction.reply({ content: 'There was an error getting a video of Evelyn. Please try again later.', ephemeral: true });
        }
    },
};

async function getRandomEvelynEdit(interaction) {
    try {
        await interaction.deferReply();

        const folderPath = path.join(__dirname, '../evelyn');
        const files = fs.readdirSync(folderPath);
        const validFiles = files.filter(file => file.endsWith('.mp4'));

        if (validFiles.length === 0) {
            return interaction.editReply({ content: 'No Evelyn edits available at the moment.' });
        }

        const randomFile = validFiles[Math.floor(Math.random() * validFiles.length)];
        const filePath = path.join(folderPath, randomFile);

        return interaction.editReply({
            files: [filePath],
        });
    } catch (error) {
        console.error('Error getting a video of Evelyn:', error);
        return interaction.editReply({ content: 'There was an error getting a video of Evelyn. Please try again later.' });
    }
}