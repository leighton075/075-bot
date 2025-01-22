const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
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
        .setName('ban')
        .setDescription('Ban a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to ban')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for ban')
                .setRequired(false)),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: "You don't have permission to ban members." });
            }

            const userId = interaction.user.id;
            const username = interaction.user.username;

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], async (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user in the database: ${err}`);
                    return interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
                }

                if (result.length > 0) {
                    const user = interaction.options.getUser('user');
                    const reason = interaction.options.getString('reason') || 'No reason provided';

                    if (interaction.user.id === '1087801524282982450') {
                        return interaction.reply('No oliver');
                    }

                    const confirm = new ButtonBuilder()
                        .setCustomId('confirm')
                        .setLabel('Confirm Ban')
                        .setStyle(ButtonStyle.Danger);

                    const cancel = new ButtonBuilder()
                        .setCustomId('cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary);

                    const row = new ActionRowBuilder().addComponents(cancel, confirm);

                    await interaction.reply({
                        content: `Are you sure you want to ban ${user.tag} for reason: ${reason}?`,
                        components: [row],
                    });

                    const filter = i => i.user.id === interaction.user.id;
                    const collector = interaction.channel.createMessageComponentCollector({
                        filter,
                        time: 10000, // 10 seconds to respond
                    });

                    collector.on('collect', async i => {
                        if (i.customId === 'confirm') {
                            try {
                                await interaction.guild.members.ban(user, { reason });

                                const insertQuery = 'INSERT INTO banned (user_id, username, reason) VALUES (?, ?, ?)';
                                db.query(insertQuery, [user.id, user.tag, reason], (insertErr) => {
                                    if (insertErr) {
                                        console.error(`[ERROR] Error adding user to banned database: ${insertErr}`);
                                        return i.update({ content: 'There was an error saving the ban to the database.', components: [] });
                                    }
                                    console.log(`[INFO] User ${user.tag} was added to the banned database.`);
                                });

                                const embed = new EmbedBuilder()
                                    .setColor('#ff0000')
                                    .setTitle(`${user.tag} has been banned.`)
                                    .setDescription(`Banned by ${interaction.user.username}`)
                                    .addFields({ name: 'Reason', value: reason })
                                    .setTimestamp()
                                    .setFooter({ text: `Banned By: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                                await i.update({ embeds: [embed], components: [] });
                                collector.stop();
                            } catch (error) {
                                console.error('[ERROR] Error banning user:', error);
                                await i.update({ content: `There was an error banning ${user.tag}.`, components: [] });
                            }
                        } else if (i.customId === 'cancel') {
                            await i.update({ content: 'Ban action has been canceled.', components: [] });
                        }
                    });

                    collector.on('end', (collected, reason) => {
                        if (reason === 'time') {
                            interaction.editReply({ content: 'You took too long to respond. Ban action canceled.', components: [] });
                        }
                    });
                } else {
                    return interaction.reply({
                        content: 'You need to verify your account first. Please verify your account using `/verify`.',
                        ephemeral: true,
                    });
                }
            });
        } catch (error) {
            console.error('[ERROR] Unexpected error during ban process:', error);
            return interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    },
};