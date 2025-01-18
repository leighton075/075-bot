const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');
const { fetch } = require('undici');
const mysql = require('mysql2');

const client = new ApifyClient({ token: process.env.APIFY_API_KEY });

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
        console.error(`[ERROR] Error connecting to the database in stalk.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in stalk.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stalk')
        .setDescription('Find all instances of a username')
        .addSubcommand(subcommand =>
            subcommand
                .setName('normal')
                .setDescription('Just a regular search')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Username to search for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('advanced')
                .setDescription('Search and filter out 404/403 links (takes 10-30 seconds longer)')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Username to search for')
                        .setRequired(true))),
        
    async execute(interaction) {
        const userId = interaction.user.id;

        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], async (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error processing your request.');
            }

            if (result.length > 0) {
                const username = interaction.options.getString('username');
                const startTime = Date.now();
                const results = [];

                const subcommand = interaction.options.getSubcommand();
                console.log(`Subcommand: ${subcommand}`);

                try {
                    console.log(`Replying to user: Searching for username: ${username}`);
                    await interaction.reply({ content: `Searching for username: **${username}**...` });

                    const runInput = { "usernames": [username] };
                    console.log('Running actor with input:', runInput);
                    const run = await client.actor('netmilk/sherlock').call(runInput);

                    const dataset = client.dataset(run.defaultDatasetId);

                    const { items } = await dataset.listItems();
                    console.log(`Fetched ${items.length} items from dataset`);

                    for (const item of items) {
                        if (item.links && item.links.length > 0) {
                            console.log(`Found ${item.links.length} links in this item`);
                    
                            if (subcommand === 'advanced') {
                                console.log(`Filtering 404 and 403 links for advanced search`);
                                for (const link of item.links) {
                                    console.log(`Checking link: ${link}`);
                                    // Skip if link contains 'discord.com'
                                    if (link.includes('discord.com')) {
                                        console.log(`Skipping link due to discord.com: ${link}`);
                                        continue;
                                    }
                    
                                    const isValidLink = await checkLink(link);
                                    if (isValidLink) {
                                        results.push(link);
                                        console.log(`Valid link found: ${link}`);
                                    } else {
                                        console.log(`Invalid link (404 or 403): ${link}`);
                                    }
                                }
                            } else {
                                // Filter out links containing 'discord.com'
                                const validLinks = item.links.filter(link => !link.includes('discord.com'));
                                results.push(...validLinks);
                                console.log(`Added valid links to results: ${validLinks}`);
                            }
                        } else {
                            console.log('No links found in this item');
                        }
                    }            

                    let responseEmbed;
                    if (results.length > 0) {
                        const foundLinks = results.map(link => `- ${link}`).join('\n');
                        responseEmbed = new EmbedBuilder()
                            .setColor('#cb668b')
                            .setTitle(`Username Found: **${username}**`)
                            .setDescription(`Found the username **"${username}"** on the following sites:`)
                            .addFields(
                                { name: 'Links', value: foundLinks || 'No links found.' }
                            )
                            .setFooter({ text: `Time taken: ${(Date.now() - startTime) / 1000}s` });
                        console.log('Results found:', foundLinks);
                    } else {
                        responseEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle(`No Results Found: **${username}**`)
                            .setDescription(`No valid results found for username **"${username}"**.`)
                            .setFooter({ text: `Time taken: ${(Date.now() - startTime) / 1000}s` });
                        console.log('No results found.');
                    }

                    console.log('Final response embed:', responseEmbed);
                    await interaction.editReply({ embeds: [responseEmbed] });

                } catch (error) {
                    console.error('Error executing /stalk command:', error);
                    await interaction.followUp('An error occurred while searching. Please try again later.');
                }
            } else {
                return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
            }
        });
    },
};

async function checkLink(link) {
    console.log(`Checking link validity: ${link}`);
    try {
        const response = await fetch(link, { method: 'HEAD' });
        console.log(`Link ${link} responded with status: ${response.status}`);

        if (response.status === 404 || response.status === 403) {
            console.log(`Link ${link} returned a ${response.status} error.`);
            return false;
        }

        if (response.status === 301 || response.status === 302) {
            console.log(`Link ${link} is redirected.`);
            return true;
        }

        return true;
    } catch (error) {
        console.error(`Error checking link ${link}:`, error);
        return false;
    }
}
