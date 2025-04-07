const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
        const userid = interaction.options.getString('userid');
        const guild = interaction.guild;

        try {
            // Check if the user has the BanMembers permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: "You don't have permission to unban members." });
            }

            await guild.members.unban(userid);
            console.log(`[INFO] Member with id ${userid} was unbanned.`);

            return interaction.reply(`User with ID ${userid} has been unbanned.`);
        } catch (error) {
            console.error('[ERROR] Error unbanning user:', error);
            return interaction.reply('There was an error unbanning the user. Please check the user ID and try again.');
        }
    },
};
