const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Gets information on a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Which user\'s information to get')
                .setRequired(false)),

    async execute(interaction) {
        // Check if the command is being used in a guild
        if (!interaction.guild) {
            return interaction.reply({ 
                content: 'This command can only be used in a server, not in DMs.', 
                ephemeral: true 
            });
        }

        const user = interaction.options.getUser('user') || interaction.user;

        try {
            const member = await interaction.guild.members.fetch(user.id);

            const roleCount = member.roles.cache.size - 1; // Exclude @everyone role
            const isOwner = user.id === interaction.guild.ownerId;
            const isAdmin = member.permissions.has('Administrator');

            let category = 'Member';
            if (isOwner) category = 'Owner';
            else if (isAdmin) category = 'Admin';

            const daysSinceCreation = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
            const daysSinceJoin = Math.floor((Date.now() - member.joinedAt) / (1000 * 60 * 60 * 24));

            const embed = new EmbedBuilder()
                .setColor('#cb668b')
                .setTitle('User Information')
                .setAuthor({
                    name: user.username,
                    iconURL: user.displayAvatarURL(),
                    url: 'https://www.youtube.com/watch?v=xvFZjo5PgG0'
                })
                .setThumbnail(user.displayAvatarURL())
                .addFields([
                    { name: 'Creation Date', value: `${user.createdAt.toDateString()}, ${daysSinceCreation} days ago`, inline: false },
                    { name: 'Join Date', value: `${member.joinedAt.toDateString()}, ${daysSinceJoin} days ago`, inline: false },
                    { name: 'Category', value: category, inline: false },
                    { 
                        name: `Roles (${roleCount})`, 
                        value: member.roles.cache.filter(role => role.name !== '@everyone') // Remove @everyone role
                                     .map(role => role.name)
                                     .join(', ') || 'No roles', 
                        inline: false 
                    }
                ]);

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error getting user\'s information', error);
            return interaction.reply({ content: 'There was an error getting the user\'s information', ephemeral: true });
        }
    },
};
