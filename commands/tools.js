const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { URL } = require('url');
const sharp = require('sharp');

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
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('width')
                        .setDescription('Width of the image (max 1920)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('height')
                        .setDescription('Height of the image (max 3840)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('download')
                .setDescription('Download media from a url')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Url to download media from')
                        .setRequired(true))),
        
    async execute(interaction) {
        fetch('https://jsonplaceholder.typicode.com/posts')
        .then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));

        const startTime = Date.now();
        console.log(`[INFO] Command execution started at ${new Date(startTime).toISOString()}`);
        
        const subcommand = interaction.options.getSubcommand();
        console.log(`[INFO] Subcommand selected: ${subcommand}`);

        if (subcommand === 'screenshot') {
            let url = interaction.options.getString('url');
            let width = interaction.options.getInteger('width');
            let height = interaction.options.getInteger('height');

            if (height && (height <= 0 || height > 3840)) {
                return interaction.reply('Please enter a valid height (max 3840)');
            }
            if (!height) {
                height = 1080;
            }
            
            if (width && (width <= 0 || width > 1920)) {
                return interaction.reply('Please enter a valid width (max 1920)');
            }
            if (!width) {
                width = 1920;
            }

            await interaction.deferReply();
            console.log(`[INFO] Screenshot URL: ${url}`);
            
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
                console.log(`[INFO] URL normalized to: ${url}`);
            }
            
            let screenshotBuffer;
            let executionTime;
        
            try {
                const captureStartTime = Date.now();
                console.log(`[INFO] Launching Puppeteer browser instance...`);
                const browser = await puppeteer.launch({
                    executablePath: '/usr/bin/chromium-browser',
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                });
            
                const page = await browser.newPage();
                console.log(`[INFO] Navigating to URL: ${url}`);

                await page.setViewport({ width: 1920, height: 1080 });

                await page.goto(url, { waitUntil: 'networkidle2' });
                console.log(`[INFO] Page loaded. Taking screenshot...`);
            
                screenshotBuffer = await page.screenshot();
                console.log(`[INFO] Screenshot captured successfully`);
                await browser.close();
                console.log(`[INFO] Browser instance closed`);
        
                if (!screenshotBuffer || screenshotBuffer.length === 0) {
                    throw new Error('Screenshot buffer is empty or invalid.');
                }
        
                console.log(`Screenshot buffer size: ${Buffer.byteLength(screenshotBuffer)} bytes`);
                const resizeStartTime = Date.now();
                const resizedScreenshotBuffer = await sharp(screenshotBuffer)
                    .resize(width, height, {
                        fit: sharp.fit.inside,
                        withoutEnlargement: true
                    })
                    .toBuffer();
                const resizeEndTime = Date.now();
                console.log(`[INFO] Screenshot resized in ${(resizeEndTime - resizeStartTime) / 1000}s`);
        
                const captureEndTime = Date.now();
                executionTime = ((captureEndTime - captureStartTime) / 1000).toFixed(2);
            
                const imgSize = (Buffer.byteLength(resizedScreenshotBuffer) / 1024).toFixed(2);
        
                const embed = new EmbedBuilder()
                    .setColor('#cb668b')
                    .setTitle(url)
                    .setImage('attachment://screenshot.png')
                    .setFooter({ text: `${width}x${height}, ${imgSize}kb, took ${executionTime} seconds` });
        
                await interaction.editReply({
                    embeds: [embed],
                    files: [{ attachment: resizedScreenshotBuffer, name: 'screenshot.png' }],
                });
                console.log(`[INFO] Screenshot sent to the user`);
            
            } catch (error) {
                console.error(`[ERROR] Error capturing screenshot: ${error.message}`);
                if (screenshotBuffer) {
                    try {
                        const fallbackStartTime = Date.now();
                        const resizedScreenshotBuffer = await sharp(screenshotBuffer)
                            .resize(1920, 1080)
                            .toBuffer();
                        const fallbackEndTime = Date.now();
                        console.log(`[INFO] Screenshot resized in ${(fallbackEndTime - fallbackStartTime) / 1000}s`);
        
                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle('Screenshot Error')
                            .setDescription('An error occurred, here\'s the screenshot.')
                            .setImage('attachment://screenshot.png');
        
                        await interaction.editReply({
                            content: 'Here is the screenshot:',
                            embeds: [embed],
                            files: [{ attachment: resizedScreenshotBuffer, name: 'screenshot.png' }],
                        });
                    } catch (fallbackError) {
                        console.error(`[ERROR] Fallback file handling failed: ${fallbackError.message}`);
                        await interaction.editReply({
                            content: 'An error occurred while taking the screenshot. Please try again later.',
                        });
                    }
                } else {
                    await interaction.editReply({
                        content: 'An error occurred while taking the screenshot. Please try again later.',
                    });
                }
            }
        }        

        if (subcommand === 'download') {
            const url = interaction.options.getString('url');
            console.log(`[DEBUG] Download URL: ${url}`);
            
            await interaction.reply({ content: 'Downloading media... Please wait.' });
            console.log(`[INFO] User notified about the download process`);

            try {
                const mediaUrl = new URL(url);
                const fileName = path.basename(mediaUrl.pathname);
                console.log(`[DEBUG] Media URL parsed successfully. Filename: ${fileName}`);

                const downloadsDir = path.join(__dirname, 'downloads');
                if (!fs.existsSync(downloadsDir)) {
                    fs.mkdirSync(downloadsDir, { recursive: true });
                    console.log(`[INFO] Created 'downloads' directory.`);
                }

                console.log(`[INFO] Fetching media from URL...`);
                const response = await axios.get(url, { responseType: 'stream', maxRedirects: 5 });

                if (response.status !== 200) {
                    console.error(`[ERROR] Failed to fetch media. HTTP Status: ${response.status}`);
                    throw new Error(`Failed to fetch media. Status: ${response.status}`);
                }

                const contentType = response.headers['content-type'];
                if (!contentType.startsWith('image/')) {
                    throw new Error('The URL does not point to an image file.');
                }

                const filePath = path.join(downloadsDir, fileName);
                console.log(`[DEBUG] Saving media to local file: ${filePath}`);

                if (!response.data || typeof response.data.pipe !== 'function') {
                    throw new Error('Response data is not a stream');
                }

                const fileStream = createWriteStream(filePath);
                response.data.pipe(fileStream);

                fileStream.on('finish', async () => {
                    console.log(`[INFO] File download completed: ${filePath}`);

                    if (fs.existsSync(filePath)) {
                        console.log(`[DEBUG] File exists at ${filePath}`);
                    } else {
                        console.error(`[ERROR] File does not exist after download!`);
                    }

                    const fileStats = fs.statSync(filePath);
                    console.log(`[DEBUG] File stats: ${JSON.stringify(fileStats)}`);

                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('Here is your downloaded media:')
                        .setImage('attachment://' + fileName);

                    console.log(`[DEBUG] Embed being created with image attachment: attachment://${fileName}`);

                    await interaction.editReply({
                        content: 'Here is your downloaded media:',
                        embeds: [embed],
                        files: [{
                            attachment: filePath,
                            name: fileName
                        }],
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
