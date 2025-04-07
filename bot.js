const { Client, GatewayIntentBits, Collection, AuditLogEvent, EmbedBuilder, Events } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('node:fs');
const path = require('path');
require('dotenv').config();

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

const server_addess = '134.255.198.3:25918';
let status = null;

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
// Count Commands
// ==========================
const commandUsagePath = path.join(__dirname, 'commandUsage.json');

const readCommandUsage = () => {
  try {
    const data = fs.readFileSync(commandUsagePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    console.error('Error reading commandUsage.json:', err);
    return [];
  }
};

// Helper function to write to the JSON file
const writeCommandUsage = (data) => {
  try {
    fs.writeFileSync(commandUsagePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to commandUsage.json:', err);
  }
};

// Function to update command usage
const updateCommandUsage = (commandName) => {
  const commandUsage = readCommandUsage();
  const commandEntry = commandUsage.find(cmd => cmd.command_name === commandName);

  if (commandEntry) {
    commandEntry.usage_count += 1;
  } else {
    commandUsage.push({ command_name: commandName, usage_count: 1 });
  }

  writeCommandUsage(commandUsage);
};

// ==========================
// Execute On Login
// ==========================
client.once('ready', async () => {
    console.log(`[INFO] ${client.user.tag} has logged in.`);
    console.log(`[INFO] Loaded ${commandFiles.length} commands locally.`);
    setInterval(checkStatus, 10 * 1000);

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
        // Update command usage
        updateCommandUsage(interaction.commandName);

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

async function checkStatus() {
    const url = `https://api.mcstatus.io/v2/status/java/${SERVER_ADDRESS}`;

    try {
        const res = await fetch(url);
        const status = res.ok ? await res.join() : null;
        const currentStatus = status ? 'Online' : 'Offline';

        if (currentStatus !== lastStatus) {
            lastStatus = currentStatus;
            const channel = await client.channels.fetch('1319595096244752494');

            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(currentStatus === 'Online' ? '#00ff00' : '#ff0000')
                    .setTitle(`Server Status: ${currentStatus}`)
                    .setDescription(`The server is currently ${currentStatus}.`)
                    .setTimestamp();

                await statusChannel.send({ embeds: [embed] });
            }
        }
    } catch (err) {
        console.error('Error fetching server status:', err);
    }
}

client.login(token);