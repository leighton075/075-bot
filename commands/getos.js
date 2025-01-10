const { SlashCommandBuilder } = require('discord.js');
const { exec } = require('child_process');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getos')
        .setDescription('Get a user\'s OS based on their IP or subnet')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('IP address or subnet to scan')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getString('target');
        await interaction.reply({
            content: 'Scanning... Please wait.',
            ephemeral: true
        });

        exec(`python3 osscan.py ${target}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[ERROR] Python script execution error: ${error}`);
                return interaction.followUp(`Sorry, there was an error executing the scan.`);
            }

            if (stderr) {
                console.error(`[ERROR] Python script stderr: ${stderr}`);
                return interaction.followUp(`Error: ${stderr}`);
            }

            console.log(stdout);
            interaction.followUp(`Scan results:\n\`\`\`${stdout}\`\`\``);
        });
    },
};
