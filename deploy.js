const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const folderPath = path.join(foldersPath, folder);

    if (fs.statSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Started clearing global and guild application (/) commands.`);

        // Clear global commands
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Successfully cleared all global commands.');

        // Clear guild commands
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        console.log(`Successfully cleared all guild commands for guild ID: ${guildId}`);

        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Register new commands
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error clearing and refreshing commands:', error);
    }
})();