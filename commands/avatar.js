const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Gets a user\'s avatar')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User whose avatar to get')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const avatarURL = targetUser.displayAvatarURL({ size: 1024, dynamic: true });

            const embed = new EmbedBuilder()
                .setColor('#cb668b')
                .setTitle(`${targetUser.username}'s avatar:`)
                .setImage(avatarURL)
                .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            const button = new ButtonBuilder()
                .setLabel('Open in Browser')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarURL);

            const row = new ActionRowBuilder().addComponents(button);

            return interaction.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Error getting user\'s avatar:', error);
            return interaction.reply({ content: 'There was an error getting the user\'s avatar', ephemeral: true });
        }
    },
};