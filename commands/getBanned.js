const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getbanned')
        .setDescription('Get the list of banned users'),

    async execute(interaction) {
        try {
            interaction.guild.bans.fetch()
                .then(bans => {
                    if (bans.size === 0) {
                        return interaction.reply({ content: 'No users are currently banned in the guild.', ephemeral: true });
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Banned Users')
                        .setDescription('Here is the list of currently banned users:')
                        .setTimestamp();

                    bans.forEach(ban => {
                        const user = ban.user;
                        embed.addFields({
                            name: user.tag,
                            value: `User ID: ${user.id}`,
                            inline: false,
                        });
                    });

                    return interaction.reply({ embeds: [embed] });
                })
                .catch(error => {
                    console.error(`[ERROR] Error fetching bans: ${error}`);
                    return interaction.reply({ content: 'An error occurred while fetching the banned users from the guild.', ephemeral: true });
                });
        } catch (error) {
            console.error(`[ERROR] Unexpected error during getbanned command: ${error}`);
            return interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    },
};
