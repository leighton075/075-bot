const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcstatus')
        .setDescription('Force refresh and post the current Minecraft server status'),

    async execute(interaction, client) {
        const mcChannelId = '1331450221435289603';
        const serverAddress = '139.99.189.213:25594';
        const apiUrl = `https://api.mcsrvstat.us/3/${serverAddress}`;

        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Discord Bot - 075-bot'
                }
            });

            const data = response.data;

            const channel = client.channels.cache.get(mcChannelId);
            if (!channel) {
                return interaction.reply({ content: 'Unable to find the status channel.', ephemeral: true });
            }

            let embed;
            if (data.online) {
                embed = new EmbedBuilder()
                    .setTitle('Minecraft Server Status (Manual Check)')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: 'Status', value: '🟢 Online', inline: true },
                        { name: 'IP', value: data.ip, inline: true },
                        { name: 'Port', value: data.port.toString(), inline: true },
                        { name: 'Version', value: data.version || 'Unknown', inline: true },
                        { name: 'Players', value: `${data.players.online}/${data.players.max}`, inline: true },
                        { name: 'MOTD', value: data.motd ? data.motd.clean.join('\n') : 'No MOTD', inline: false }
                    )
                    .setTimestamp();

                if (data.icon) {
                    embed.setThumbnail(data.icon);
                }
            } else {
                embed = new EmbedBuilder()
                    .setTitle('Minecraft Server Status (Manual Check)')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Status', value: '🔴 Offline', inline: true },
                        { name: 'IP', value: data.ip || 'Unknown', inline: true },
                        { name: 'Port', value: data.port ? data.port.toString() : 'Unknown', inline: true }
                    )
                    .setTimestamp();
            }

            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: 'Server status posted to the channel.', ephemeral: true });

        } catch (error) {
            console.error('Error fetching server status:', error);
            await interaction.reply({ content: 'Failed to fetch server status. Please try again later.', ephemeral: true });
        }
    },
};