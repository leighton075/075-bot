const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite the bot'),

    async execute(interaction) {
        return interaction.reply("https://discord.com/oauth2/authorize?client_id=1290426522519343187");
    },
};
