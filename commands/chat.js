const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const mysql = require('mysql2');
const OpenAi = require('openai');

const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: 'bot_verification'
});

db.connect((err) => {
    if (err) {
        console.error(`[ERROR] Error connecting to the database in ban.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the MySQL database in ban.js.`);
    }
});

const openai = new OpenAi({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_KEY,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Chat with an ai bot')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('Prompt for the bot')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (interaction.channel.id !== '1332214186314436759') {
                return interaction.reply('Go to the bot-chat channel so I don\'t lose all my money');
            }

            const userId = interaction.user.id;
            const username = interaction.user.username;

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], async (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user in the database: ${err}`);
                    return interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
                }

                if (result.length > 0) {
                    const prompt = interaction.options.getString('prompt');

                    try {
                        const completion = await openai.chat.completions.create({
                            messages: [{ role: "system", content: `Format the answer for a terminal with only plain text. You are primarily used for code development so give a general explanation fro each function. ${prompt}\n` }],
                            model: "deepseek-chat",
                        });

                        interaction.reply(completion.choices[0].message.content);
                    } catch (error) {
                        console.error(`[ERROR]:\n${error}`);
                        return interaction.reply('There was an error processing your prompt.');
                    }          
                } else {
                    return interaction.reply({
                        content: 'You need to verify your account first. Please verify your account using `/verify`.',
                        ephemeral: true,
                    });
                }
            });
        } catch (error) {
            console.error('[ERROR] Unexpected error during chat process:', error);
            return interaction.reply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    },
};