const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('square')
        .setDescription('Returns the square of a number.')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('The number to square')
                .setRequired(true)),
    async execute(interaction) {
        const number = interaction.options.getInteger('number');
        
        let result = number * number;
        if (number < 0) {
            result = -result;
        }

        await interaction.reply({ content: `The result of squaring ${number} is ${result}.` });
    },
};