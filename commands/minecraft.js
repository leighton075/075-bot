const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const SERVER_ADDRESS = '134.255.198.3:25918';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Check the status of the Minecraft server'),
    
    async execute(interaction) {
        const url = `https://api.mcstatus.io/v2/status/java/${SERVER_ADDRESS}`;

        console.log(`[DEBUG] Pinging Minecraft server at: ${url}`);

        try {
            await interaction.deferReply(); // Defer the reply to allow time for the fetch request

            const res = await fetch(url);

            if (!res.ok) {
                console.error(`[ERROR] Failed to fetch server status. HTTP Status: ${res.status}`);
                return interaction.editReply('Failed to fetch server status. Please try again later.');
            }

            const status = await res.json();
            console.log(`[DEBUG] Server response: ${JSON.stringify(status)}`);

            const currentStatus = status.online ? 'Online' : 'Offline';
            const embed = new EmbedBuilder()
                .setColor(currentStatus === 'Online' ? '#00ff00' : '#ff0000')
                .setTitle(`Minecraft Server Status: ${currentStatus}`)
                .setDescription(
                    status.online
                        ? `The server is online with ${status.players.online} players currently connected.`
                        : 'The server is currently offline.'
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error(`[ERROR] Error fetching server status: ${err.message}`);
            await interaction.editReply('An error occurred while fetching the server status. Please try again later.');
        }
    },
};