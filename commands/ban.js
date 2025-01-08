const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

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
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
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

        const row = new ActionRowBuilder()
            .addComponents(cancel, confirm);

        try {
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

                        await i.update({ content: `${user.tag} has been banned. Reason: ${reason}`, components: [] });
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

        } catch (error) {
            console.error('Error during ban process:', error);
            return interaction.reply({ content: `There was an error with the ban process.`, ephemeral: true });
        }
    },
};
