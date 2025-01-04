const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite the bot'),

    async execute(interaction) {
        try {
            return interaction.reply("https://discord.com/oauth2/authorize?client_id=1290426522519343187");
        } catch (error) {
            console.error('Error inviting bot:', error);
            return interaction.reply('There was an error trying to send the invite link');
        }
    },
};
