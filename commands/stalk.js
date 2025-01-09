const { SlashCommandBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');
const fetch = require('node-fetch');

const client = new ApifyClient({ token: process.env.APIFY_API_KEY });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stalk')
        .setDescription('Find all instances of a username')
        .addSubcommand(subcommand =>
            subcommand
                .setName('normal')
                .setDescription('Just a regular search')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Username to search for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('advanced')
                .setDescription('Search and filter out 404 links')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Username to search for')
                        .setRequired(true))),
        
    async execute(interaction) {
        const username = interaction.options.getString('username');
        const startTime = Date.now();
        const results = [];

        const subcommand = interaction.options.getSubcommand();

        try {
            await interaction.reply({ content: `Searching for username: **${username}**...` });

            const runInput = { "usernames": [username] }
            const run = await client.actor('netmilk/sherlock').call(runInput);

            const dataset = client.dataset(run.defaultDatasetId);

            const { items } = await dataset.listItems();

            for (const item of items) {
                if (item.links && item.links.length > 0) {
                    if (subcommand === 'advanced') {
                        for (const link of item.links) {
                            const isValidLink = await checkLink(link);
                            if (isValidLink) {
                                results.push(link);
                            }
                        }
                    } else {
                        results.push(...item.links);
                    }
                }
            }

            let response;
            if (results.length > 0) {
                const foundLinks = results.map(link => `- ${link}`).join('\n');
                response = `Found the username **"${username}"** on the following sites:\n${foundLinks}\nTime taken: ${(Date.now() - startTime) / 1000}s`;
            } else {
                response = `No valid results found for username **"${username}"**.\n\nTime taken: ${(Date.now() - startTime) / 1000}s`;
            }

            await interaction.editReply(response);

        } catch (error) {
            console.error('Error executing /stalk command:', error);
            await interaction.followUp('An error occurred while searching. Please try again later.');
        }
        console.log(`Execution time: ${(Date.now() - startTime) / 1000}s`);
    },
};

// Helper function to check if the link is valid
async function checkLink(link) {
    try {
        const response = await fetch(link, { method: 'HEAD' });
        if (response.status === 404) {
            console.log(`Link ${link} returned a 404 error.`);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`Error checking link ${link}:`, error);
        return false;
    }
}
