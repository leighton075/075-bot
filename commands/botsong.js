const { SlashCommandBuilder } = require('discord.js');
const SpotifyWebApi = require('spotify-web-api-node');
const mysql = require('mysql2');

// ==========================
//    Spotify Setup & Auth
// ==========================
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// ==========================
//        mySQL Setup
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
        console.log(`[INFO] Connected to the mySQL database in botsong.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botsong')
        .setDescription('Change the song the bot is listening to.')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('Play a specific song')
                .setRequired(false)),

    async execute(interaction, client) {
        try {
            await playRandomSong(interaction, client);
        } catch (error) {
            return interaction.followUp({ content: 'There was an error changing the song. Please try again later.' });
        }
    },
};

let accessToken = '';

async function authenticateSpotify() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        accessToken = data.body['access_token'];
        spotifyApi.setAccessToken(accessToken);
    } catch (err) {
        console.error('[ERROR] Error getting Spotify access token:', err);
    }
}

let lastTrack = null;

async function playRandomSong(interaction, client) {
    const playlistId = '210tfDJT6HnJeGwyg01dBd';
    await authenticateSpotify();

    let randomTrack = null;

    if (interaction.options.getString('song')) {
        const songQuery = interaction.options.getString('song');
        const searchResult = await spotifyApi.searchTracks(songQuery, { limit: 1 });

        if (searchResult.body.tracks.items.length === 0) {
            return interaction.reply({ content: 'No song found with that name.' });
        }

        randomTrack = searchResult.body.tracks.items[0];
    } else {
        let allTracks = [];
        let nextPage = null;

        do {
            const playlistData = await spotifyApi.getPlaylistTracks(playlistId, {
                limit: 100,
                offset: nextPage ? allTracks.length : 0,
            });

            const tracks = playlistData.body.items;

            if (tracks.length === 0) {
                return interaction.reply({ content: 'No tracks found in the playlist.' });
            }

            allTracks = allTracks.concat(tracks);
            nextPage = playlistData.body.next;

        } while (nextPage);

        if (allTracks.length === 0) {
            return interaction.reply({ content: 'No tracks found in the playlist.' });
        }

        randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)].track;

        while (randomTrack.name === lastTrack) {
            randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)].track;
        }
    }

    if (!randomTrack) {
        return interaction.reply({ content: 'Failed to select a track.' });
    }

    console.log(`[DEBUG] Setting activity to: ${randomTrack.name} by ${randomTrack.artists[0].name}`);
    client.user.setActivity(`${randomTrack.name} by ${randomTrack.artists[0].name}`, {
        type: 2,
        url: randomTrack.external_urls.spotify
    });

    const channel = client.channels.cache.get('1319595096244752494');
    if (channel) {
        await interaction.deferReply();
        await interaction.followUp({ content: `Now listening to: ${randomTrack.name} by ${randomTrack.artists[0].name}` });
    }

    lastTrack = randomTrack.name;
}