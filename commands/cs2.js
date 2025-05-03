const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Mocked database to store linked Steam accounts and match share codes
const userLinkDatabase = {}; // userLinkDatabase[userID] = { steamId: "steamId", shareCode: "shareCode" }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cs2')
        .setDescription('Get CS2 stats for a Steam player')
        // Main stats subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Get CS2 stats for a Steam player')
                .addStringOption(option =>
                    option
                        .setName('player')
                        .setDescription('Steam username')
                        .setRequired(true)
                )
        )
        // Subcommand to link a Steam account to a Discord user
        .addSubcommand(subcommand =>
            subcommand
                .setName('link')
                .setDescription('Link your Discord account to a Steam account')
                .addStringOption(option =>
                    option
                        .setName('steamprofile')
                        .setDescription('Your Steam profile URL')
                        .setRequired(true)
                )
        )
        // Subcommand to set match share code
        .addSubcommand(subcommand =>
            subcommand
                .setName('setsharecode')
                .setDescription('Set your CS2 match share code')
                .addStringOption(option =>
                    option
                        .setName('sharecode')
                        .setDescription('Your match share code')
                        .setRequired(true)
                )
        )
        // Subcommand to test the linked Steam account and share code
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Check your linked Steam account and match share code')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'stats') {
            // Fetch CS2 stats for a player using their Steam username
        }

        if (subcommand === 'link') {
            // Link Steam account to Discord user from profile URL
            const steamProfile = interaction.options.getString('steamprofile');
            
            // Extract Steam ID from the profile URL
            const steamIdMatch = steamProfile.match(/steamcommunity\.com\/profiles\/(\d+)/);
            
            if (!steamIdMatch) {
                return await interaction.reply({
                    content: 'Invalid Steam profile URL. Please provide a valid URL in the format https://steamcommunity.com/profiles/<steamid>.'
                });
            }
            
            const steamId = steamIdMatch[1]; // Extracted Steam ID

            userLinkDatabase[userId] = { steamId }; // Store the Steam ID in the mock database

            await interaction.reply({
                content: `Your Steam account with ID ${steamId} has been linked to your Discord account.`
            });
        }

        if (subcommand === 'setsharecode') {
            // Set match share code for a user
            const shareCode = interaction.options.getString('sharecode');

            if (!userLinkDatabase[userId]) {
                return await interaction.reply({
                    content: 'You need to link your Steam account first using `/cs2 link <steamid>`'
                });
            }

            userLinkDatabase[userId].shareCode = shareCode;

            await interaction.reply({
                content: `Your match share code has been set to: ${shareCode}`
            });
        }

        if (subcommand === 'test') {
            // Check the user's linked Steam account and share code
            const userLink = userLinkDatabase[userId];

            if (!userLink) {
                return await interaction.reply({
                    content: 'You have not linked a Steam account yet. Please use `/cs2 link <steamid>` to link your account.'
                });
            }

            const steamId = userLink.steamId || 'Not set';
            const shareCode = userLink.shareCode || 'Not set';

            await interaction.reply({
                content: `Your Steam account ID is: ${steamId}\nYour match share code is: ${shareCode}`
            });
        }
    },
};
