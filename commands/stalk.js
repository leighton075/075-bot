const { SlashCommandBuilder } = require('discord.js');
const { ApifyClient } = require('apify-client');

const client = new ApifyClient({ token: process.env.APIFY_API_KEY });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stalk')
        .setDescription('find all instances of a username')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username to search for')
                .setRequired(true)),

    async execute(interaction) {
        const username = interaction.options.getString('username');
        const startTime = Date.now();

        try {
            await interaction.reply({ content: `Searching for username: **${username}**...` });

            const runInput = { "usernames": [username] }
            const run = await client.actor('netmilk/sherlock').call(runInput);

            const dataset = client.dataset(run.defaultDatasetId);
            const results = [];

            for await (const item of dataset.iterateItems()) {
                if (item.links && item.links.length > 0) {
                    results.push(...item.links);
                }
            }

            let response;
            if (results.length > 0) {
                const foundLinks = results.map(link => `- ${link}`).join('\n');
                response = `Found the username **"${username}"** on the following sites:\n${foundLinks}\nTime taken: ${Date.now() - startTime}ms`;
            } else {
                response = `No results found for username **"${username}"**.\n\nTime taken: ${Date.now() - startTime}ms`;
            }

            await interaction.followUp(response);

        } catch (error) {
            console.error('Error executing /stalk command:', error);
            await interaction.followUp('An error occurred while searching. Please try again later.');
        }
        console.log(`Execution time: ${Date.now() - startTime}ms`);
    },
};
