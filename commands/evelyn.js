const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('evelyn')
        .setDescription('Get a random edit of Evelyn'),

    async execute(interaction) {
        try {
            await getRandomEvelynEdit(interaction);
        } catch (error) {
            console.error('[ERROR] Error executing evelyn command:', error);
            return interaction.reply({ content: 'There was an error getting a video of Evelyn. Please try again later.', ephemeral: true });
        }
    },
};

async function getRandomEvelynEdit(interaction) {
    try {
        await interaction.deferReply();

        const folderPath = path.join(__dirname, '../evelyn');
        const files = fs.readdirSync(folderPath);
        const validFiles = files.filter(file => file.endsWith('.mp4'));

        if (validFiles.length === 0) {
            return interaction.editReply({ content: 'No Evelyn edits available at the moment.' });
        }

        const randomFile = validFiles[Math.floor(Math.random() * validFiles.length)];
        const filePath = path.join(folderPath, randomFile);

        return interaction.editReply({
            files: [filePath],
        });
    } catch (error) {
        console.error('Error getting a video of Evelyn:', error);
        return interaction.editReply({ content: 'There was an error getting a video of Evelyn. Please try again later.' });
    }
}
