const { SlashCommandBuilder } = require('discord.js');
const { exec } = require('child_process');
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
        console.error(`[ERROR] Error connecting to the database in getos.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in getos.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getos')
        .setDescription('Get a user\'s OS based on their IP or subnet')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('IP address or subnet to scan')
                .setRequired(true)),

    async execute(interaction) {
        const userId = interaction.user.id;

        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], async (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error processing your request.');
            }

            if (result.length > 0) {
                const target = interaction.options.getString('target');
                await interaction.reply({ content: 'Scanning... Please wait.', ephemeral: true });

                exec(`python3 osscan.py ${target}`, (error, stdout, stderr) => {
                    if (error) {
                        return interaction.followUp(`Sorry, there was an error executing the script. ${error}`);
                    }

                    if (stderr) {
                        return interaction.followUp(`Error: ${stderr}`);
                    }

                    console.log(stdout);
                    interaction.followUp(`Scan results:\n\`\`\`${stdout}\`\`\``);
                });
            } else {
                return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
            }
        });
    },
};