const { SlashCommandBuilder } = require('discord.js');
const OpenAi = require('openai');
require('dotenv').config();

const openai = new OpenAi({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_KEY,
});

const cooldownMap = new Map();
const COOLDOWN_TIME = 60000; // 60 seconds

function splitMessage(content, maxLength = 2000) {
    const chunks = [];
    for (let i = 0; i < content.length; i += maxLength) {
        chunks.push(content.slice(i, i + maxLength));
    }
    return chunks;
}

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
            await interaction.deferReply();

            const userId = interaction.user.id;

            const lastUsed = cooldownMap.get(userId);
            if (lastUsed && Date.now() - lastUsed < COOLDOWN_TIME) {
                const timeLeft = (COOLDOWN_TIME - (Date.now() - lastUsed)) / 1000;
                return interaction.editReply({
                    content: `You are on cooldown. Please wait ${timeLeft.toFixed(1)} seconds before using this command again.`,
                    ephemeral: true,
                });
            }

            cooldownMap.set(userId, Date.now());

            if (interaction.channel.id !== '1332214186314436759' && interaction.channel.id !== '1332273827446784072') {
                return interaction.editReply('Go to the bot-chat channel so we don\'t get fanfics in general.');
            }

            const prompt = interaction.options.getString('prompt');

            try {
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: `You are a chat bot in a Discord server. Limit responses to 4000 characters at dont use icons that have to be embeded. User prompt: ${prompt}` }
                    ],
                    model: "deepseek-chat",
                });

                const response = completion.choices[0].message.content;

                // Split and send the response in chunks
                const chunks = splitMessage(response);
                await interaction.editReply(chunks[0]);

                for (let i = 1; i < chunks.length; i++) {
                    await interaction.followUp({ content: chunks[i] });
                }

            } catch (error) {
                console.error(`[ERROR] Error getting AI response:`, error);
                await interaction.editReply('There was an error processing your prompt.');
            }

        } catch (error) {
            console.error('[ERROR] Unexpected error during chat process:', error);
            await interaction.editReply({ content: 'An unexpected error occurred. Please try again later.', ephemeral: true });
        }
    },
};
