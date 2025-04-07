const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Deletes messages')
        .addIntegerOption(option =>
            option
                .setName('messages')
                .setDescription('Amount of messages to delete')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const deleteCount = interaction.options.getInteger('messages');

        if (!deleteCount || deleteCount < 1 || deleteCount > 100) {
            return interaction.reply("Pick a valid number between 1 and 100.");
        }

        try {
            if (interaction.user.id === '1087801524282982450') {
                return interaction.reply({ content: 'Good try oliver, tell me to fix this if you see this message' });
            }

            const messages = await interaction.channel.messages.fetch({ limit: deleteCount });
            await interaction.channel.bulkDelete(messages, true);
            const replyMessage = await interaction.reply(`Successfully deleted ${deleteCount} messages!`);
            setTimeout(() => replyMessage.delete(), 10000);
        } catch (error) {
            return interaction.reply('There was an error trying to delete messages in this channel!', error);
        }
    },
};
