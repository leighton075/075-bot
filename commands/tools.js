const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { URL } = require('url');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tools')
        .setDescription('A bunch of tools')
        .addSubcommand(subcommand =>
            subcommand
                .setName('screenshot')
                .setDescription('Takes a screenshot of a website')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Url of a website to screenshot')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('download')
                .setDescription('Download media from a url')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Url to download media from')
                        .setRequired(true))),
        
    async execute(interaction) {
        const startTime = Date.now();
        const subcommand = interaction.options.getSubcommand();
        console.log(`Subcommand: ${subcommand}`);

        if (subcommand === 'screenshot') {
            const url = interaction.options.getString('url');
            try {
                const browser = await puppeteer.launch();
                const page = await browser.newPage();

                await page.goto(url, { waitUntil: 'networkidle2' });

                const screenshot = await page.screenshot();

                await browser.close();

                await interaction.editReply({
                    content: 'Here is the screenshot:',
                    files: [{ attachment: screenshot, name: 'screenshot.png' }],
                });
                console.log(`Screenshot taken for ${url}`);

            } catch (error) {
                console.error('Error capturing screenshot:', error);
                await interaction.editReply({ content: 'An error occurred while taking the screenshot. Please try again later.' });
            }
        }

        if (subcommand === 'download') {
            const url = interaction.options.getString('url');
            await interaction.reply({ content: 'Downloading media... Please wait.' });

            try {
                const mediaUrl = new URL(url);
                const fileName = path.basename(mediaUrl.pathname);

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Failed to fetch media.');
                }

                const filePath = path.join(__dirname, 'downloads', fileName);
                const fileStream = createWriteStream(filePath);

                response.body.pipe(fileStream);

                fileStream.on('finish', async () => {
                    console.log(`Downloaded file: ${filePath}`);

                    await interaction.editReply({
                        content: 'Here is your downloaded media:',
                        files: [{ attachment: filePath, name: fileName }],
                    });

                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting the file:', err);
                    });
                });

            } catch (error) {
                console.error('Error downloading media:', error);
                await interaction.editReply({
                    content: 'An error occurred while downloading the media. Please check the URL and try again.',
                });
            }
        }

        console.log(`Execution time: ${(Date.now() - startTime) / 1000}s`);
    },
};
