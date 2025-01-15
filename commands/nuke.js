const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Deletes messages')
        .addIntegerOption(option =>
            option
                .setName('messages')
                .setDescription('Amount of messages to delete')
                .setRequired(true)),

    async execute(interaction) {
        const imTheBiggestBird = '1087890340792512603';  
        const deleteCount = interaction.options.getInteger('messages');
        
        if (interaction.user.id !== imTheBiggestBird) {
            return interaction.reply("You are not the biggest bird");
        }

        if (!deleteCount || deleteCount < 0 || deleteCount > 100) {
            return interaction.reply("Pick a valid number between 1 and 100.");
        }

        try {
            const messages = await interaction.channel.messages.fetch({ limit: deleteCount});
            await interaction.channel.bulkDelete(messages, true);
            const replyMessage = await interaction.reply(`Successfully deleted ${deleteCount} messages!`);
            setTimeout(() => replyMessage.delete(), 10000); // Delete the reply message after 10 seconds
        } catch (error) {
            return interaction.reply('There was an error trying to delete messages in this channel!', error);
        }
    },
};
