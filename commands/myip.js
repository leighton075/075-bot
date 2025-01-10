const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getos')
        .setDescription('Get a user\'s OS based on their IP')
        .addStringOption(option =>
            option
                .setName('ip')
                .setDescription('User\'s IP')
                .setRequired(true)),

    async execute(interaction) {
        try {
            console.log('[INFO] Received request to get OS information.');

            const ip = interaction.options.getString('ip');
            console.log(`[DEBUG] User provided IP: ${ip}`);

            await interaction.reply({
                content: 'Fetching OS information... Please wait.',
                ephemeral: true
            });

            console.log(`[INFO] Attempting to fetch IP information from ipinfo.io for IP: ${ip}`);

            try {
                const ipInfo = await axios.get(`https://ipinfo.io/${ip}/json`);
                console.log(`[DEBUG] Received response from ipinfo.io: ${JSON.stringify(ipInfo.data)}`);

                const osData = ipInfo.data;

                if (osData.os) {
                    console.log(`[INFO] Detected OS for IP ${ip}: ${osData.os}`);
                    await interaction.followUp(`Operating System for IP ${ip}: ${osData.os}`);
                } else {
                    console.log(`[INFO] No OS detected for IP ${ip}`);
                    await interaction.followUp(`Could not detect the OS for IP ${ip}.`);
                }
            } catch (error) {
                console.error(`[ERROR] Error fetching data from ipinfo.io: ${error}`);
                await interaction.followUp(`Sorry, there was an error retrieving the OS information: ${error.message}`);
            }
        } catch (error) {
            console.error(`[ERROR] Error in the overall process: ${error}`);
            await interaction.reply(`Sorry, there was an error: ${error.message}`);
        }
    },
};
