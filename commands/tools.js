const { SlashCommandBuilder } = require('discord.js');
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
        console.log(`[INFO] Command execution started at ${new Date(startTime).toISOString()}`);
        
        const subcommand = interaction.options.getSubcommand();
        console.log(`[INFO] Subcommand selected: ${subcommand}`);

        if (subcommand === 'screenshot') {
            let url = interaction.options.getString('url');
            await interaction.deferReply();
            console.log(`[INFO] Screenshot URL: ${url}`);
        
            // Ensure the URL has a valid scheme
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
                console.log(`[INFO] URL normalized to: ${url}`);
            }
        
            try {
                console.log(`[INFO] Launching Puppeteer browser instance...`);
                const browser = await puppeteer.launch({
                    executablePath: '/usr/bin/chromium-browser',
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                });
                const page = await browser.newPage();
                console.log(`[INFO] Navigating to URL: ${url}`);
        
                await page.goto(url, { waitUntil: 'networkidle2' });
                console.log(`[INFO] Page loaded. Taking screenshot...`);
        
                const screenshot = await page.screenshot();
                console.log(`[INFO] Screenshot captured successfully`);
        
                await browser.close();
                console.log(`[INFO] Browser instance closed`);
        
                await interaction.editReply({
                    content: 'Here is the screenshot:',
                    files: [{ attachment: screenshot, name: 'screenshot.png' }],
                });
                console.log(`[INFO] Screenshot sent to the user`);
        
            } catch (error) {
                console.error(`[ERROR] Error capturing screenshot: ${error.message}`);
                await interaction.editReply({
                    content: 'An error occurred while taking the screenshot. Please try again later.',
                });
            }
        }

        if (subcommand === 'download') {
            const url = interaction.options.getString('url');
            console.log(`[INFO] Download URL: ${url}`);
            
            await interaction.reply({ content: 'Downloading media... Please wait.' });
            console.log(`[INFO] User notified about the download process`);

            try {
                const mediaUrl = new URL(url);
                const fileName = path.basename(mediaUrl.pathname);
                console.log(`[INFO] Media URL parsed successfully. Filename: ${fileName}`);

                console.log(`[INFO] Fetching media from URL...`);
                const response = await fetch(url);

                if (!response.ok) {
                    console.error(`[ERROR] Failed to fetch media. HTTP Status: ${response.status}`);
                    throw new Error(`Failed to fetch media. Status: ${response.status}`);
                }

                const filePath = path.join(__dirname, 'downloads', fileName);
                console.log(`[INFO] Saving media to local file: ${filePath}`);

                const fileStream = createWriteStream(filePath);
                response.body.pipe(fileStream);

                fileStream.on('finish', async () => {
                    console.log(`[INFO] File download completed: ${filePath}`);

                    await interaction.editReply({
                        content: 'Here is your downloaded media:',
                        files: [{ attachment: filePath, name: fileName }],
                    });
                    console.log(`[INFO] File sent to the user: ${fileName}`);

                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error(`[ERROR] Error deleting the file: ${err.message}`);
                        } else {
                            console.log(`[INFO] File deleted successfully: ${filePath}`);
                        }
                    });
                });

                fileStream.on('error', (err) => {
                    console.error(`[ERROR] File stream error: ${err.message}`);
                });

            } catch (error) {
                console.error(`[ERROR] Error downloading media: ${error.message}`);
                await interaction.editReply({
                    content: 'An error occurred while downloading the media. Please check the URL and try again.',
                });
            }
        }

        const endTime = Date.now();
        console.log(`[INFO] Command execution completed in ${(endTime - startTime) / 1000}s`);
    },
};
