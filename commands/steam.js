const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

async function convertToSteamID64(id) {
    // Add conversion logic if needed
    // For now just return as-is assuming it's already 64-bit
    return id;
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
                        .setDescription('Steam user ID')
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
                        .setDescription('Steam user ID')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userid = interaction.options.getString('userid');
        const game = interaction.options.getString('game');
        const apiKey = process.env.STEAM_WEB_API_KEY;
        
        try {
            if (subcommand === 'inventory') {
                console.log('Received `/steam inventory` command');
                console.log(`User ID: ${userid}`);
                console.log(`Game (if specified): ${game || 'All Games'}`);
                
                const inventoryUrl = `https://www.steamwebapi.com/steam/api/inventory?key=${apiKey}&steam_id=${userid}${game ? `&game=${game}` : ''}`;
                console.log(`Inventory API URL: ${inventoryUrl}`);
                
                try {
                    console.log('Sending request to Steam API for inventory...');
                    const inventoryResponse = await axios.get(inventoryUrl);
                    console.log('Received response from Steam API.');
                    
                    const inventoryData = inventoryResponse.data;
                    if (!inventoryData || !inventoryData.items || inventoryData.items.length === 0) {
                        console.log('No items found in the inventory data.');
                        return interaction.reply({ content: 'No items found in the inventory.', ephemeral: true });
                    }
            
                    console.log('Processing inventory data...');
                    const totalItems = inventoryData.items.reduce((sum, item) => {
                        console.log(`Adding ${item.count} items of ${item.markethashname}`);
                        return sum + item.count;
                    }, 0);
            
                    const totalCost = inventoryData.items.reduce((sum, item) => {
                        const itemCost = item.pricelatest ? (item.count * item.pricelatest) : 0;
                        console.log(`Calculating cost for ${item.markethashname}: ${item.count} x $${item.pricelatest ? item.pricelatest.toFixed(2) : 'N/A'} = $${itemCost.toFixed(2)}`);
                        return sum + itemCost;
                    }, 0);
            
                    console.log(`Total Items: ${totalItems}`);
                    console.log(`Total Value: $${totalCost.toFixed(2)}`);
            
                    const embed = new EmbedBuilder()
                        .setTitle(`Inventory for User: ${userid}`)
                        .setDescription(game ? `Game: ${game}` : 'All Games')
                        .addFields(
                            { name: 'Total Items', value: `${totalItems}`, inline: true },
                            { name: 'Total Value (USD)', value: `$${totalCost.toFixed(2)}`, inline: true }
                        )
                        .setColor(0x00AE86);
            
                    const maxItemsToShow = 10;
                    inventoryData.items.slice(0, maxItemsToShow).forEach(item => {
                        console.log(`Adding item to embed: ${item.markethashname}`);
                        const itemValue = item.pricelatest ? (item.count * item.pricelatest).toFixed(2) : 'N/A';
                        embed.addFields({
                            name: item.markethashname,
                            value: `${item.count} x $${item.pricelatest ? item.pricelatest.toFixed(2) : 'N/A'} = $${itemValue}`,
                            inline: false
                        });
                    });
            
                    if (inventoryData.items.length > maxItemsToShow) {
                        console.log('Inventory has more items than can be displayed.');
                        embed.addFields({ name: '...and more', value: `Showing top ${maxItemsToShow} items.` });
                    }
            
                    console.log('Sending embed response to Discord...');
                    await interaction.reply({ embeds: [embed] });
                    console.log('Response sent successfully.');
                } catch (error) {
                    console.error('Error fetching inventory from Steam API:', error.message);
                    console.log('Error details:', error.stack);
                    await interaction.reply({ content: `Failed to fetch inventory for user ID ${userid}: ${error.message}`, flags: InteractionResponseFlags });
                }
            }

            if (subcommand === 'profile') {
                console.log('Received `/steam profile` command')
                
                if (!userid) {
                    return interaction.reply({ content: 'Please provide a valid Steam user ID.', ephemeral: true });
                }

                if (!process.env.STEAM_WEB_API_KEY) {
                    return interaction.reply({ 
                        content: 'Steam API is not configured', 
                        ephemeral: true 
                    });
                }
                
                try {
                    const steamId64 = userid.length === 17 ? userid : await convertToSteamID64(userid);
                    const profileUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_WEB_API_KEY}&steamids=${steamId64}`;
                    const profileResponse = await axios.get(profileUrl);
                    const profileData = profileResponse.data.response.players[0];
        
                    const embed = new EmbedBuilder()
                    .setTitle(`Steam Profile: ${profileData.personaname || 'Unknown'}`)
                    .setThumbnail(profileData.avatarfull)
                    .addFields(
                        { name: 'Steam ID', value: profileData.steamid, inline: true },
                        { name: 'Profile URL', value: `[Link](${profileData.profileurl})`, inline: false },
                        { name: 'Status', value: profileData.personastate === 1 ? 'Online' : 'Offline', inline: true }
                    )
                    .setColor(0x00AE86);
                
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Steam API Error:', error.response?.data || error.message);
                    await interaction.reply({ 
                        content: `Failed to fetch profile: ${error.response?.data?.error || error.message}`,
                        ephemeral: true 
                    });
                }
            }
        } catch (error) {
            console.error(`Error fetching Steam data: ${error.message}`);
            await interaction.reply({ content: `Failed to fetch data for user ID ${userid}: ${error.message}`, ephemeral: true });
        }
    },
};
