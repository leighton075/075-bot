const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const discordToken = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID; // Your bot's application ID

// Load all command files
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(discordToken);

(async () => {
    try {
        console.log('Started refreshing global application (/) commands.');

        // Register global commands
        await rest.put(
            Routes.applicationCommands(clientId), // Global registration endpoint
            { body: commands },
        );

        console.log('Successfully reloaded global application (/) commands.');
    } catch (error) {
        console.error('Error refreshing commands globally:', error);
    }
})();
