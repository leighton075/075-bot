const { SlashCommandBuilder, EmbedBuilder, InteractionResponse } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const mysql = require('mysql2');

// ==========================
//        mySQL Setup
// ==========================
const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: 'bot_verification'
});

db.connect((err) => {
    if (err) {
        console.error(`[ERROR] Error connecting to the database: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database.`);
    }
});

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
                    
                    // Check if the response contains items
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
                        // Ensure price exists to avoid errors
                        const itemCost = item.pricelatest ? (item.count * item.pricelatest) : 0;
                        console.log(`Calculating cost for ${item.markethashname}: ${item.count} x $${item.pricelatest ? item.pricelatest.toFixed(2) : 'N/A'} = $${itemCost.toFixed(2)}`);
                        return sum + itemCost;
                    }, 0);
            
                    console.log(`Total Items: ${totalItems}`);
                    console.log(`Total Value: $${totalCost.toFixed(2)}`);
            
                    // Build the embed
                    const embed = new EmbedBuilder()
                        .setTitle(`Inventory for User: ${userid}`)
                        .setDescription(game ? `Game: ${game}` : 'All Games')
                        .addFields(
                            { name: 'Total Items', value: `${totalItems}`, inline: true },
                            { name: 'Total Value (USD)', value: `$${totalCost.toFixed(2)}`, inline: true }
                        )
                        .setColor(0x00AE86);
            
                    // Display individual items (limit to 10 for embed size)
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
                const userid = interaction.options.getString('userid');
            
                if (!userid) {
                    return interaction.reply({ content: 'Please provide a valid Steam user ID.', ephemeral: true });
                }
            
                try {
                    const profileUrl = `https://www.steamwebapi.com/steam/api/profile?key=${process.env.STEAM_WEB_API_KEY}&steam_id=${userid}`;
                    const profileResponse = await axios.get(profileUrl);
                    const profileData = profileResponse.data;

                    console.log(profileData);

                    const embed = new EmbedBuilder()
                        .setTitle(`Steam Profile: ${profileData.personaname || 'Unknown'}`)
                        .setThumbnail(profileData.avatarfull)
                        .addFields(
                            { name: 'Real Name', value: profileData.realname || 'N/A', inline: true },
                            { name: 'Steam ID', value: profileData.steamid, inline: true },
                            { name: 'Profile URL', value: `[Link](${profileData.profileurl})`, inline: false },
                            { name: 'Community Visibility', value: profileData.communityvisibilitymessage, inline: true },
                            { name: 'Account Creation Date', value: `<t:${Math.floor(profileData.timecreated)}:F>`, inline: true }
                        )
                        .setColor(0x00AE86);

                    if (profileData.mostplayedgames && profileData.mostplayedgames.length > 0) {
                        const gameDetails = profileData.mostplayedgames
                            .map(
                                (game) =>
                                    `**[${game.gamename}](${game.gamelink})**\n- Total Time: ${game.hoursonrecord} hours\n- Last 2 Weeks: ${game.playtimelast2weeks || 0} hours`
                            )
                            .join('\n\n');
                        embed.addFields({ name: 'Recent Activity', value: gameDetails, inline: false });
                    }
            
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    console.error('Error fetching Steam profile:', error.message);
                    await interaction.reply({ content: `Failed to fetch profile for user ID ${userid}: ${error.message}`, ephemeral: true });
                }
            }            
        } catch (error) {
            console.error(`Error fetching Steam data: ${error.message}`);
            await interaction.reply({ content: `Failed to fetch data for user ID ${userid}: ${error.message}`, ephemeral: true });
        }
    },
};
