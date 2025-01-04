const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.reply({ content: `Kicking user ${user.tag}...`, ephemeral: true });

            await interaction.guild.members.kick(user, { reason });

            await interaction.followUp({ content: `${user.tag} has been kicked. Reason: ${reason}` });

        } catch (error) {
            console.error('Error kicking user:', error);
            return interaction.reply({ content: `There was an error kicking ${user.tag}`, ephemeral: true });
        }
    },
};
