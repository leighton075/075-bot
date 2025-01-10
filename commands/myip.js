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
            const ip = interaction.options.getString('ip');

            await interaction.reply({
                content: 'Fetching OS information... Please wait.',
                ephemeral: true
            });

            try {
                const ipInfo = await axios.get(`https://ipinfo.io/${ip}/json`);
                const osData = ipInfo.data;

                if (osData.os) {
                    await interaction.followUp(`Operating System for IP ${ip}: ${osData.os}`);
                } else {
                    await interaction.followUp(`Could not detect the OS for IP ${ip}.`);
                }
            } catch (error) {
                await interaction.followUp(`Sorry, there was an error retrieving the OS information: ${error.message}`);
            }
        } catch (error) {
            await interaction.reply(`Sorry, there was an error: ${error.message}`);
        }
    },
};
