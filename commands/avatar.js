const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
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
        console.error(`[ERROR] Error connecting to the database in avatar.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in avatar.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Gets a user\'s avatar')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User whose avatar to get')
                .setRequired(false)),

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
                    const targetUser = interaction.options.getUser('user') || interaction.user;
                    const avatarURL = targetUser.displayAvatarURL({ size: 1024, dynamic: true });

                    const embed = new EmbedBuilder()
                        .setColor('#cb668b')
                        .setTitle(`${targetUser.username}'s avatar:`)
                        .setImage(avatarURL)
                        .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                    const button = new ButtonBuilder()
                        .setLabel('Open in Browser')
                        .setStyle(ButtonStyle.Link)
                        .setURL(avatarURL);

                    const row = new ActionRowBuilder().addComponents(button);

                    return interaction.reply({ embeds: [embed], components: [row] });
                } else {
                    return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
                }
            });
        } catch (error) {
            console.error('Error getting user\'s avatar:', error);
            return interaction.reply({ content: 'There was an error getting the user\'s avatar', ephemeral: true });
        }
    },
};