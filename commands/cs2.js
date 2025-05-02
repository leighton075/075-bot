const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get CS2 stats for a Steam player')
        .addStringOption(option =>
            option
                .setName('player')
                .setDescription('Steam username')
                .setRequired(true)
        ),

    async execute(interaction) {
        const username = interaction.options.getString('player');

        try {
            const response = await axios.get(`https://public-api.tracker.gg/v2/csgo/standard/profile/steam/${username}`, {
                headers: {
                    'TRN-Api-Key': process.env.TRACKER_KEY,
                },
            });

            const data = response.data.data;
            const stats = data.segments[0].stats;

            const embed = new EmbedBuilder()
                .setTitle(`CS:GO Stats for ${data.platformInfo.platformUserHandle}`)
                .setThumbnail(data.platformInfo.avatarUrl)
                .setColor(0x0099ff)
                .addFields(
                    { name: 'K/D', value: stats.kd.displayValue || 'N/A', inline: true },
                    { name: 'Kills', value: stats.kills.displayValue || 'N/A', inline: true },
                    { name: 'Headshot %', value: stats.headshotPct.displayValue || 'N/A', inline: true },
                    { name: 'Win %', value: stats.wlPercentage.displayValue || 'N/A', inline: true },
                    { name: 'Accuracy', value: stats.shotsAccuracy.displayValue || 'N/A', inline: true },
                    { name: 'Playtime', value: stats.timePlayed.displayValue || 'N/A', inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `❌ Failed to fetch stats: ${error.response?.data?.message || error.message}` });
        }
    },
};
