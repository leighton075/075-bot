const { SlashCommandBuilder } = require('discord.js');
const mysql = require('mysql2');
const OpenAi = require('openai');
require('dotenv').config();

const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: 'bot_verification'
});

db.connect((err) => {
    if (err) {
        console.error(`[ERROR] Error connecting to the database in chat.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the MySQL database in chat.js.`);
    }
});

const openai = new OpenAi({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_KEY,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Chat with an AI bot')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('Prompt for the bot')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Defer the reply to avoid interaction timeout
            await interaction.deferReply();

            if (interaction.channel.id !== '1332214186314436759') {
                return interaction.editReply('Go to the bot-chat channel so I don\'t lose all my money');
            }

            const userId = interaction.user.id;

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], async (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user in the database: ${err}`);
                    return interaction.editReply({ content: 'There was an error processing your request.', ephemeral: true });
                }

                if (result.length > 0) {
                    const prompt = interaction.options.getString('prompt');

                    try {
                        const completion = await openai.chat.completions.create({
                            messages: [{ role: "system", content: `You are a chat bot in a discord server. User prompt: ${prompt}` }],
                            model: "deepseek-chat",
                        });

                        // Edit the deferred reply with the AI's response
                        await interaction.editReply(completion.choices[0].message.content);
                    } catch (error) {
                        console.error(`[ERROR]:\n${error}`);
                        await interaction.editReply('There was an error processing your prompt.');
                    }          
                } else {
                    await interaction.editReply({
                        content: 'You need to verify your account first. Please verify your account using `/verify`.',
                        ephemeral: true,
                    });
                }
            });
        } catch (error) {
            console.error('[ERROR] Unexpected error during chat process:', error);
            await interaction.editReply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    },
};