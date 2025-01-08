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
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, consoleArgs = null) {
        let user, reason;

        if (consoleArgs) {
            // Console execution
            const [userId, ...reasonParts] = consoleArgs;
            user = await interaction.guild.members.fetch(userId).catch(() => null);
            reason = reasonParts.join(' ') || 'No reason provided';
        } else {
            // Interaction execution
            user = interaction.options.getUser('user');
            reason = interaction.options.getString('reason') || 'No reason provided';
        }

        if (!user) {
            return interaction
                ? interaction.reply({ content: 'User not found.', ephemeral: true })
                : console.log('User not found.');
        }

        try {
            if (!consoleArgs) {
                await interaction.reply({ content: `Banning user ${user.tag}...`, ephemeral: true });
            }

            await interaction.guild.members.ban(user, { reason });

            const successMessage = `${user.tag} has been banned. Reason: ${reason}`;
            return interaction
                ? interaction.followUp({ content: successMessage })
                : console.log(successMessage);
        } catch (error) {
            console.error('Error banning user:', error);
            const errorMessage = `There was an error banning ${user.tag}`;
            return interaction
                ? interaction.reply({ content: errorMessage, ephemeral: true })
                : console.log(errorMessage);
        }
    },
};
