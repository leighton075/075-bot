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
        console.error(`[ERROR] Error connecting to the database in ping.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in ping.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban someone')
        .addStringOption(option =>
            option
                .setName('userid')
                .setDescription('The userid of the person to unban')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userId = interaction.user.id;

        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], async (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error processing your request.');
            }

            if (result.length > 0) {
                const userid = interaction.options.getString('userid');
                const guild = interaction.guild;

                try {
                    await guild.members.unban(userid);
                    console.log(`[INFO] Member with id ${userid} was unbanned.`);

                    const deleteQuery = 'DELETE FROM banned WHERE user_id = ?';
                    db.query(deleteQuery, [userid], (deleteErr) => {
                        if (deleteErr) {
                            console.error(`[ERROR] Error removing user from banned table: ${deleteErr}`);
                            return interaction.reply('There was an error removing the user from the banned list.');
                        }
                        console.log(`[INFO] User with id ${userid} removed from banned database.`);
                    });

                    return interaction.reply(`User with ID ${userid} has been unbanned and their record has been removed from the banned list.`);
                } catch (error) {
                    console.error('[ERROR] Error unbanning user:', error);
                    return interaction.reply('There was an error unbanning the user. Please check the user ID and try again.');
                }
            } else {
                return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
            }
        });
    },
};