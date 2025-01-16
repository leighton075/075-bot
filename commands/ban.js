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
        console.log(`[INFO] Connected to the mySQL database in ban.js.`);
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
            const userId = interaction.user.id;

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], async (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user in the database: ${err}`);
                    return interaction.reply('There was an error processing your request.');
                }

                if (result.length > 0) {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                        return interaction.reply({ content: "You don't have the permission to ban members.", ephemeral: true });
                    }

                    if (!interaction.guild.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                        return interaction.reply({ content: "I don't have permission to ban members.", ephemeral: true });
                    }

                    const user = interaction.options.getUser('user');
                    const reason = interaction.options.getString('reason') || 'No reason provided';

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
                        time: 10000,
                    });

                    collector.on('collect', async i => {
                        if (i.customId === 'confirm') {
                            try {
                                await interaction.guild.members.ban(user, { reason });

                                const embed = new EmbedBuilder()
                                    .setColor('#ff0000')
                                    .setTitle(`${user.tag} has been banned.`)
                                    .setDescription(`Banned by ${interaction.user.username}`)
                                    .setFooter({ text: `Reason for ban: ${reason}`, iconURL: interaction.user.displayAvatarURL() });

                                await i.update({ embeds: [embed], components: [] });
                                collector.stop();
                            } catch (error) {
                                console.error('Error banning user:', error);
                                await i.update({ content: `There was an error banning ${user.tag}`, components: [] });
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
                    return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
                }
            });
        } catch (error) {
            console.error('Error during ban process:', error);
            return interaction.reply({ content: `There was an error with the ban process.`, ephemeral: true });
        }
    },
};