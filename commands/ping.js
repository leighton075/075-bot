const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s response time'),

    async execute(interaction) {
        const start = Date.now();

        await interaction.reply('Pinging...');

        const end = Date.now();

        const ping = end - start;
        interaction.editReply(`pong! ${ping}ms`);
    },
};
