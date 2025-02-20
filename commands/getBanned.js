const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
        console.error(`[ERROR] Error connecting to the database in ban.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the MySQL database in ban.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getbanned')
        .setDescription('Get the list of banned users'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user verification: ${err}`);
                    return interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
                }

                if (result.length > 0) {
                    interaction.guild.bans.fetch()
                        .then(bans => {
                            if (bans.size === 0) {
                                return interaction.reply({ content: 'No users are currently banned in the guild.', ephemeral: true });
                            }

                            const embed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('Banned Users')
                                .setDescription('Here is the list of currently banned users:')
                                .setTimestamp();

                            bans.forEach(ban => {
                                const user = ban.user;
                                embed.addFields({
                                    name: user.tag,
                                    value: `User ID: ${user.id}`,
                                    inline: false,
                                });
                            });

                            return interaction.reply({ embeds: [embed] });
                        })
                        .catch(error => {
                            console.error(`[ERROR] Error fetching bans: ${error}`);
                            return interaction.reply({ content: 'An error occurred while fetching the banned users from the guild.', ephemeral: true });
                        });
                } else {
                    return interaction.reply({
                        content: 'You need to verify your account first. Please verify your account using `/verify`.',
                        ephemeral: true,
                    });
                }
            });
        } catch (error) {
            console.error(`[ERROR] Unexpected error during getbanned command: ${error}`);
            return interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    },
};