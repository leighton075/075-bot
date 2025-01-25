const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, Collection, AuditLogEvent, EmbedBuilder, Events } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('node:fs');
const mysql = require('mysql2');
require('dotenv').config();

// ==========================
// Express Server for GitHub Webhooks
// ==========================
const app = express();
const PORT = 5000;

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
// mySQL Setup
// ==========================
const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: 'bot_verification'
});

db.connect((err) => {
    if (err) {
        console.error(`[ERROR] Error connecting to the database: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database.`);
    }
});

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

    if (message.channel.id === linkChannel && !message.content.includes('https://photos.app.goo.gl/')) {
        message.delete()
            .then(() => console.log(`Deleted message from ${message.author.tag}`))
            .catch((error) => console.error('Failed to delete message:', error));
    }

    if (message.webhookId) {
        try {
            await message.publish();
            console.log('Message published!');
        } catch (error) {
          console.error('Error publishing message:', error);
        }
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

// ==========================
// GitHub Webhook Endpoint
// ==========================
app.use(express.json());

// Store the last sent message ID for GitHub updates
let lastGitHubMessageId = null;

app.post('/github-webhook', async (req, res) => {
    const payload = req.body;

    // Check if the payload has the expected structure
    if (!payload || !payload.ref || !payload.head_commit || !payload.repository) {
        return res.status(400).send('Invalid payload');
    }

    // Check if the event is a push to the main branch
    if (payload.ref === 'refs/heads/main') { // Adjust the branch name if necessary
        const commitMessage = payload.head_commit.message || 'No commit message';
        const author = payload.head_commit.author?.name || 'Unknown Author';
        const repoName = payload.repository.name || 'Unknown Repository';
        const commitHash = payload.head_commit.id;

        try {
            // Fetch the commit details from the GitHub API
            const commitDetails = await fetchCommitDetails(payload.repository.full_name, commitHash);

            // Get the number of lines added and removed
            const added = commitDetails.stats?.additions || 0;
            const removed = commitDetails.stats?.deletions || 0;

            // Get the list of modified files
            const modifiedFiles = commitDetails.files
                ?.filter(file => file.status === 'modified') // Filter only modified files
                .map(file => file.filename) // Extract filenames
                .join('\n') || 'No files modified'; // Join filenames with newlines

            // Create the Discord message
            const message = `🎉 **Update Detected** 🎉\nRepository: **${repoName}**\nAuthor: **${author}**\nCommit Message: **${commitMessage}**\nLines Added: **${added}**\nLines Removed: **${removed}**\nModified Files:\n\`\`\`\n${modifiedFiles}\n\`\`\``;

            // Send the message to a specific Discord channel
            const githubChannel = client.channels.cache.get('1319595096244752494');
            if (githubChannel) {
                if (lastGitHubMessageId) {
                    try {
                        // Delete the previous message
                        const lastMessage = await githubChannel.messages.fetch(lastGitHubMessageId);
                        await lastMessage.delete();
                        console.log(`Deleted previous GitHub update message: ${lastGitHubMessageId}`);
                    } catch (error) {
                        console.error('Error deleting previous GitHub update message:', error);
                    }
                }

                // Send the new message
                const newMessage = await githubChannel.send(message);
                lastGitHubMessageId = newMessage.id;
                console.log(`GitHub update message sent: ${newMessage.id}`);
            } else {
                console.error('GitHub channel not found.');
            }

            // Send a success response
            res.status(200).send('Webhook received');
        } catch (error) {
            console.error('Error processing GitHub webhook:', error);
            res.status(500).send('Error processing webhook');
        }
    } else {
        res.status(200).send('Not a push to the main branch');
    }
});

// Function to fetch commit details from the GitHub API
async function fetchCommitDetails(repoFullName, commitHash) {
    const url = `${GITHUB_API_URL}/repos/${repoFullName}/commits/${commitHash}`;
    const headers = {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
    };

    const response = await axios.get(url, { headers });
    return response.data;
}

// Start the Express server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`GitHub webhook listener running on http://localhost:${PORT}`);
});

// Log in the bot
client.login(token);