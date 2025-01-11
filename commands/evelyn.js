const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('evelyn')
        .setDescription('Get a random edit of evelyn'),

    async execute(interaction) {
        try {
            const folderPath = path.join(__dirname, '../evelyn');
            const files = fs.readdirSync(folderPath);
            const validFiles = files.filter(file => file.endsWith('.mp4'));

            if (validFiles.length === 0) {
                return interaction.reply({ content: 'No evelyn edits available at the moment.'});
            }

            const randomFile = validFiles[Math.floor(Math.random() * validFiles.length)];
            const filePath = path.join(folderPath, randomFile);

            return interaction.reply({
                files: [filePath],
            });
            

        } catch (error) {
            console.error('Error getting a video of Evelyn:', error);
            return interaction.reply({
                content: 'There was an error getting a video of Evelyn. Please try again later.',
            });
        }
    },
};
