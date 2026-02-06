const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcstatus')
        .setDescription('Force refresh and post the current Minecraft server status'),

    async execute(interaction, client) {
        const mcChannelId = '1331450221435289603'; // The channel to post updates
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

            let statusMessage = '';
            let embedColor = data.online ? 0x00FF00 : 0xFF0000;
            let fields = [
                { name: 'IP', value: data.ip || 'Unknown', inline: true },
                { name: 'Port', value: data.port ? data.port.toString() : 'Unknown', inline: true }
            ];

            if (data.online) {
                statusMessage = '🟢 Online';
                if (data.version) fields.push({ name: 'Version', value: data.version, inline: true });
                if (data.players) fields.push({ name: 'Players', value: `${data.players.online}/${data.players.max}`, inline: true });
                if (data.motd) fields.push({ name: 'MOTD', value: data.motd.clean.join('\n'), inline: false });
            } else {
                // Determine offline reason
                let offlineReason = 'Server offline';
                if (data.debug) {
                    if (!data.debug.srv) {
                        offlineReason = 'Server not found (DNS/SRV record issue)';
                        embedColor = 0xFFA500; // Orange for DNS issues
                    } else if (!data.debug.ping && !data.debug.query) {
                        offlineReason = 'Server not responding (possibly stopped, crashed, or network issue)';
                    } else if (data.debug.querymismatch) {
                        offlineReason = 'Port mismatch detected (query port differs from server port)';
                    } else if (data.debug.ipinsrv) {
                        offlineReason = 'SRV record contains IP (should use hostname)';
                    } else if (data.debug.cnameinsrv) {
                        offlineReason = 'SRV record contains CNAME (should use A/AAAA records)';
                    }
                }
                statusMessage = `🔴 ${offlineReason}`;

                // Add debug info fields
                if (data.debug) {
                    fields.push(
                        { name: 'Debug - Ping', value: data.debug.ping ? '✅' : '❌', inline: true },
                        { name: 'Debug - Query', value: data.debug.query ? '✅' : '❌', inline: true },
                        { name: 'Debug - SRV', value: data.debug.srv ? '✅' : '❌', inline: true }
                    );
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('Minecraft Server Status (Manual Check)')
                .setColor(embedColor)
                .addFields(
                    { name: 'Status', value: statusMessage, inline: false },
                    ...fields
                )
                .setTimestamp();

            if (data.online && data.icon) {
                embed.setThumbnail(data.icon);
            }

            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: 'Server status posted to the channel.', ephemeral: true });

        } catch (error) {
            console.error('Error fetching server status:', error);
            await interaction.reply({ content: 'Failed to fetch server status. Please try again later.', ephemeral: true });
        }
    },
};