const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
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
        console.error(`[ERROR] Error connecting to the database in kick.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in kick.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to kick')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        


    async execute(interaction) {
        /*
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: "You don't have the permission to kick members." });
        }

        if (!interaction.guild.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: "I don't have permission to kick members." });
        }
        */

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm Kick')
            .setStyle(ButtonStyle.Danger);

        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(cancel, confirm);

        try {
            if (interaction.user.id === '1087801524282982450') {
                return interaction.reply({ content: 'Good try oliver, tell me to fix this if you see this message' });
            }

            await interaction.reply({ content: `Are you sure you want to kick ${user.tag} for reason: ${reason}?`, components: [row] });

            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 10000,
            });

            collector.on('collect', async i => {
                if (i.customId === 'confirm') {
                    try {
                        await interaction.guild.members.kick(user, { reason });
                        
                        const embed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle(`${user.tag} has been kicked.`)
                            .setDescription(`Kicked by ${interaction.user.username}`)
                            .setFooter({ text: `Reason for kick: ${reason}`, iconURL: interaction.user.displayAvatarURL() });

                        await i.update({embeds: [embed], components: []});
                        collector.stop();
                    } catch (error) {
                        interaction.reply(`There was an error ${error}`);
                        await i.update({ content: `There was an error kicking ${user.tag}`, components: [] });
                    }
                } else if (i.customId === 'cancel') {
                    await i.update({ content: 'Kick action has been canceled.', components: [] });
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ content: 'You took too long to respond. Kick action canceled.', components: [] });
                }
            });

        } catch (error) {
            return interaction.reply({ content: `There was an error with the kick process: ${error}`, ephemeral: true });
        }
    },
};