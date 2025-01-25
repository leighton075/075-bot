const { Client, GatewayIntentBits, Collection, AuditLogEvent, EmbedBuilder, Events } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('node:fs');
const path = require('path');
require('dotenv').config();

// ==========================
// Web Socket Server
// ==========================
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('New client connected');
  
    // Send initial command usage data
    const commandUsage = readData();
    ws.send(JSON.stringify(commandUsage));
  
    // Listen for messages from the client (optional)
    ws.on('message', (message) => {
      console.log(`Received message: ${message}`);
    });
  
    // Handle client disconnect
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

const broadcastCommandUsage = () => {
    const commandUsage = readData();
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(commandUsage));
        }
    });
};

const updateCommandUsage = (commandName) => {
    const commandUsage = readData();
    const commandEntry = commandUsage.find(cmd => cmd.command_name === commandName);
  
    if (commandEntry) {
      commandEntry.usage_count += 1;
    } else {
      commandUsage.push({ command_name: commandName, usage_count: 1 });
    }
  
    writeData(commandUsage);
    broadcastCommandUsage(); // Broadcast the updated data
};
// ==========================
// Discord Client
// ==========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

// ==========================
// Spotify Login & Auth
// ==========================
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let accessToken = '';

async function authenticateSpotify() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        accessToken = data.body['access_token'];
        spotifyApi.setAccessToken(accessToken);
        console.log('Spotify access token acquired.');
    } catch (err) {
        console.error('Error getting Spotify access token:', err);
    }
}

// ==========================
// JSON File Setup
// ==========================
const dataFilePath = path.join(__dirname, 'commandUsage.json');

// Helper function to read the JSON file
const readData = () => {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return [];
    }
};

// Helper function to write to the JSON file
const writeData = (data) => {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing to JSON file:', err);
    }
};

// ==========================
// Register Commands
// ==========================
const commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        if (!command.data || typeof command.data.toJSON !== 'function') {
            console.error(`Invalid command structure in file: ${file}`);
            continue;
        }
        commands.set(command.data.name, command);
    } catch (error) {
        console.error(`Error loading command file ${file}:`, error);
    }
}

// ==========================
// Execute On Login
// ==========================
client.once('ready', async () => {
    console.log(`[INFO] ${client.user.tag} has logged in.`);
    console.log(`[INFO] Loaded ${commandFiles.length} commands locally.`);

    await authenticateSpotify();

    const playlistId = '210tfDJT6HnJeGwyg01dBd';

    try {
        console.log(`[DEBUG] Fetching tracks from playlist ID: ${playlistId}`);
        
        let allTracks = [];
        let nextPage = null;

        do {
            const playlistData = await spotifyApi.getPlaylistTracks(playlistId, {
                limit: 100,
                offset: nextPage ? allTracks.length : 0
            });

            const tracks = playlistData.body.items;

            if (tracks.length === 0) {
                console.log(`[ERROR] No tracks found in the playlist.`);
                break;
            }

            allTracks = allTracks.concat(tracks);

            nextPage = playlistData.body.next;

        } while (nextPage);

        if (allTracks.length === 0) {
            console.log(`[ERROR] No tracks found in the playlist.`);
            return;
        }

        const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)].track;

        if (randomTrack) {
            console.log(`[DEBUG] Random track selected: ${randomTrack.name} by ${randomTrack.artists[0].name}`);

            console.log(`[DEBUG] Setting activity with URL: ${randomTrack.external_urls.spotify}`);
            client.user.setActivity(`${randomTrack.name} by ${randomTrack.artists[0].name}`, {
                type: 2,
                url: randomTrack.external_urls.spotify
            });

            console.log(`[INFO] Bot is now listening to: ${randomTrack.name}`);
        } else {
            console.log(`[ERROR] No track selected.`);
        }
    } catch (err) {
        console.error(`[ERROR] Error fetching playlist tracks: ${err}`);
    }
});

// ==========================
// Command Used
// ==========================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({ content: 'Unknown command!', ephemeral: true });
    }

    try {
        // Update command usage in JSON file
        const commandUsage = readData();
        const commandName = interaction.commandName;
        const commandEntry = commandUsage.find(cmd => cmd.command_name === commandName);

        if (commandEntry) {
            commandEntry.usage_count += 1;
        } else {
            commandUsage.push({ command_name: commandName, usage_count: 1 });
        }

        writeData(commandUsage);

        await command.execute(interaction, client);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
    }
});

// ==========================
// Message Sent
// ==========================
client.on(Events.MessageCreate, async (message) => {
    const linkChannel = '1319595051160047627';
    if (message.author.bot) return;

    // Handle link channel moderation
    if (message.channel.id === linkChannel && !message.content.includes('https://photos.app.goo.gl/')) {
        message.delete()
            .then(() => console.log(`Deleted message from ${message.author.tag}`))
            .catch((error) => console.error('Failed to delete message:', error));
    }
});

// ==========================
// When User Joins Server
// ==========================
client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`${member.user.tag} has joined the server!`);

    const joinChannel = member.guild.channels.cache.find(ch => ch.name === 'joins-bans');

    if (joinChannel) {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, actionType: 1 });
            const inviter = auditLogs.entries.first() ? auditLogs.entries.first().executor : null;

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Welcome, ${member.user.username}!`)
                .setDescription(`Invited by ${inviter ? inviter.tag : 'Unknown'}`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                )
                .setFooter({ text: 'Im the biggest bird, not you', iconURL: member.guild.iconURL() })
                .setTimestamp();

            joinChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching audit logs:', error.message);
        }
    }
});

// ==========================
// When User Leaves/Kicked/Banned
// ==========================
client.on(Events.GuildMemberRemove, async (member) => {
    console.log(`${member.user.tag} has left the server!`);

    const joinChannel = member.guild.channels.cache.find(ch => ch.name === 'joins-bans');

    if (joinChannel) {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
            const banLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });

            let embed;
            const kickEntry = auditLogs.entries.first();
            const banEntry = banLogs.entries.first();

            if (kickEntry && kickEntry.target.id === member.id) {
                embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${member.user.username} was kicked from the server`)
                    .setDescription(`Kicked by ${kickEntry.executor.tag}`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                    )
                    .setFooter({ text: 'Kicked by the server', iconURL: member.guild.iconURL() })
                    .setTimestamp();
            } else if (banEntry && banEntry.target.id === member.id) {
                embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${member.user.username} was banned from the server`)
                    .setDescription(`Banned by ${banEntry.executor.tag}`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                    )
                    .setFooter({ text: 'Banned by the server', iconURL: member.guild.iconURL() })
                    .setTimestamp();
            } else {
                embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${member.user.username} left the server`)
                    .setDescription(`${member.user.username} decided to leave the server.`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                    )
                    .setFooter({ text: 'Goodbye!', iconURL: member.guild.iconURL() })
                    .setTimestamp();
            }

            joinChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching audit logs:', error.message);
        }
    }
});

client.login(token);