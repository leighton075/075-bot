const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for ban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.reply({ content: `Banning user ${user.tag}...`, ephemeral: true });

            await interaction.guild.members.kick(user, { reason });

            await interaction.followUp({ content: `${user.tag} has been Banned. Reason: ${reason}` });

        } catch (error) {
            console.error('Error banning user:', error);
            return interaction.reply({ content: `There was an error banning ${user.tag}`, ephemeral: true });
        }
    },
};
