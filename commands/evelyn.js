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
        console.error(`[ERROR] Error connecting to the database: ${err}`);
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
    },
};
