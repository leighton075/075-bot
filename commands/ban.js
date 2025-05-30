const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

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
        } catch (error) {
            console.error('[ERROR] Unexpected error during ban process:', error);
            return interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    },
};