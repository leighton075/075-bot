const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
        console.error(`[ERROR] Error connecting to the database in nuke.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in nuke.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Deletes messages')
        .addIntegerOption(option =>
            option
                .setName('messages')
                .setDescription('Amount of messages to delete')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const userId = interaction.user.id;

        const checkQuery= 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], async (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error processing your request.');
            }

            if (result.length > 0) {
                const deleteCount = interaction.options.getInteger('messages');
        
                if (!deleteCount || deleteCount < 0 || deleteCount > 100) {
                    return interaction.reply("Pick a valid number between 1 and 100.");
                }
        
                try {
                    if (interaction.user.id === '1087801524282982450') {
                        return interaction.reply({ content: 'Good try oliver, tell me to fix this if you see this message' });
                    }
        
                    const messages = await interaction.channel.messages.fetch({ limit: deleteCount});
                    await interaction.channel.bulkDelete(messages, true);
                    const replyMessage = await interaction.reply(`Successfully deleted ${deleteCount} messages!`);
                    setTimeout(() => replyMessage.delete(), 10000);
                } catch (error) {
                    return interaction.reply('There was an error trying to delete messages in this channel!', error);
                }
            } else {
                return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
            }
        })
    },
};
