const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

class SteamIDConverter {
    static async resolveSteamID(input, apiKey) {
        // Check if input is already a SteamID64 (17 digits)
        if (/^\d{17}$/.test(input)) {
            return input;
        }

        // Check if the input is a custom URL (steamcommunity.com/id/username)
        const customUrlMatch = input.match(/steamcommunity\.com\/id\/([^\/]+)/);
        if (customUrlMatch) {
            return this.resolveVanityURL(customUrlMatch[1], apiKey);
        }

        // Check if the input is a profile URL (steamcommunity.com/profiles/SteamID64)
        const profileUrlMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/);
        if (profileUrlMatch) {
            return profileUrlMatch[1];
        }

        // Check if input is a SteamID3 ([U:1:12345678])
        const steamID3Match = input.match(/^\[U:1:(\d+)\]$/);
        if (steamID3Match) {
            return this.convertSteamID3To64(steamID3Match[1]);
        }

        // Check if input is a SteamID (STEAM_0:0:12345678)
        const steamIDMatch = input.match(/^STEAM_([0-5]):([01]):(\d+)$/);
        if (steamIDMatch) {
            return this.convertSteamIDTo64(steamIDMatch[1], steamIDMatch[2], steamIDMatch[3]);
        }

        // Assume it's a vanity URL and try to resolve
        return this.resolveVanityURL(input, apiKey);
    }

    static async resolveVanityURL(vanityUrl, apiKey) {
        try {
            const response = await axios.get(
                'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/',
                { params: { key: apiKey, vanityurl: vanityUrl } }
            );

            if (response.data.response.success === 1) {
                return response.data.response.steamid;
            }
            throw new Error('Custom URL not found');
        } catch (error) {
            throw new Error(`Failed to resolve vanity URL: ${error.message}`);
        }
    }

    static convertSteamIDTo64(universe, authServer, accountNumber) {
        // Formula: (accountNumber * 2) + authServer + 76561197960265728
        return (BigInt(accountNumber) * 2n + BigInt(authServer) + 76561197960265728n);
    }

    static convertSteamID3To64(accountNumber) {
        // Formula: accountNumber + 76561197960265728
        return BigInt(accountNumber) + 76561197960265728n;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steam')
        .setDescription('Commands for Steam')
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Get the items and value of a user\'s inventory')
                .addStringOption(option =>
                    option
                        .setName('userid')
                        .setDescription('Steam user ID, custom URL, or profile URL')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('game')
                        .setDescription('Inventory for a specific game')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('profile')
                .setDescription('Get the profile for a user')
                .addStringOption(option =>
                    option
                        .setName('userid')
                        .setDescription('Steam user ID, custom URL, or profile URL')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userInput = interaction.options.getString('userid');
        const game = interaction.options.getString('game');
        const apiKey = process.env.STEAM_WEB_API_KEY;

        if (!apiKey) {
            return interaction.reply({ 
                content: 'Steam API is not configured', 
                ephemeral: true 
            });
        }

        try {
            // Convert any input format to SteamID64
            const steamId64 = await SteamIDConverter.resolveSteamID(userInput, apiKey);
            
            if (subcommand === 'inventory') {
                const inventoryUrl = `https://www.steamwebapi.com/steam/api/inventory?key=${apiKey}&steam_id=${steamId64}${game ? `&game=${game}` : ''}`;
                
                const inventoryResponse = await axios.get(inventoryUrl);
                const inventoryData = inventoryResponse.data;

                if (!inventoryData?.items?.length) {
                    return interaction.reply({ content: 'No items found in the inventory.', ephemeral: true });
                }

                const totalItems = inventoryData.items.reduce((sum, item) => sum + item.count, 0);
                const totalCost = inventoryData.items.reduce((sum, item) => 
                    sum + (item.pricelatest ? (item.count * item.pricelatest) : 0), 0);

                const embed = new EmbedBuilder()
                    .setTitle(`Inventory for SteamID: ${steamId64}`)
                    .setDescription(game ? `Game: ${game}` : 'All Games')
                    .addFields(
                        { name: 'Total Items', value: `${totalItems}`, inline: true },
                        { name: 'Total Value (USD)', value: `$${totalCost.toFixed(2)}`, inline: true }
                    )
                    .setColor(0x00AE86);

                const maxItemsToShow = 10;
                inventoryData.items.slice(0, maxItemsToShow).forEach(item => {
                    const itemValue = item.pricelatest ? (item.count * item.pricelatest).toFixed(2) : 'N/A';
                    embed.addFields({
                        name: item.markethashname,
                        value: `${item.count} x $${item.pricelatest?.toFixed(2) || 'N/A'} = $${itemValue}`,
                        inline: false
                    });
                });

                if (inventoryData.items.length > maxItemsToShow) {
                    embed.addFields({ name: '...and more', value: `Showing top ${maxItemsToShow} items.` });
                }

                await interaction.reply({ embeds: [embed] });
            }

            if (subcommand === 'profile') {
                const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId64}`;
                const profileResponse = await axios.get(profileUrl);
                const profileData = profileResponse.data.response.players[0];

                if (!profileData) {
                    return interaction.reply({ content: 'Steam profile not found.', ephemeral: true });
                }

                const statusMap = {
                    0: 'Offline',
                    1: 'Online',
                    2: 'Busy',
                    3: 'Away',
                    4: 'Snooze',
                    5: 'Looking to trade',
                    6: 'Looking to play'
                };

                const embed = new EmbedBuilder()
                    .setTitle(`Steam Profile: ${profileData.personaname}`)
                    .setURL(profileData.profileurl)
                    .setThumbnail(profileData.avatarfull)
                    .addFields(
                        { name: 'Status', value: statusMap[profileData.personastate] || 'Unknown', inline: true },
                        { name: 'Created', value: profileData.timecreated ? new Date(profileData.timecreated * 1000).toLocaleDateString() : 'Unknown', inline: true },
                        { name: 'Last Online', value: profileData.lastlogoff ? new Date(profileData.lastlogoff * 1000).toLocaleString() : 'Unknown', inline: true },
                        { name: 'SteamID64', value: profileData.steamid, inline: false }
                    )
                    .setColor(0x00AE86);

                if (profileData.gameextrainfo) {
                    embed.addFields({ 
                        name: 'Currently Playing', 
                        value: profileData.gameextrainfo, 
                        inline: true 
                    });
                }

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Steam Command Error:', error);
            await interaction.reply({ 
                content: `Error: ${error.message}`,
                ephemeral: true 
            });
        }
    }
};