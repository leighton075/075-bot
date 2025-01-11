const { SlashCommandBuilder } = require('discord.js');
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let accessToken = '';
let currentTimeout = null;

async function authenticateSpotify() {
    try {
        console.log('[DEBUG] Attempting to authenticate with Spotify...');
        const data = await spotifyApi.clientCredentialsGrant();
        accessToken = data.body['access_token'];
        spotifyApi.setAccessToken(accessToken);
        console.log('[DEBUG] Spotify access token acquired.');
    } catch (err) {
        console.error('[ERROR] Error getting Spotify access token:', err);
    }
}

let lastTrack = null;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nextsong')
        .setDescription('Change the song the bot is listening to.')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('Play a specific song')
                .setRequired(false)),

    async execute(interaction, client) {
        try {
            console.log('[DEBUG] Command executed, checking for song argument...');
            const playlistId = '210tfDJT6HnJeGwyg01dBd';
            await authenticateSpotify();

            let randomTrack = null;

            if (interaction.options.getString('song')) {
                console.log('[DEBUG] Song argument provided, searching for the song...');
                const songQuery = interaction.options.getString('song');
                const searchResult = await spotifyApi.searchTracks(songQuery, { limit: 1 });

                if (searchResult.body.tracks.items.length === 0) {
                    console.log('[ERROR] No song found with that name.');
                    return interaction.reply({ content: 'No song found with that name.' });
                }

                randomTrack = searchResult.body.tracks.items[0];
                console.log(`[DEBUG] Found song: ${randomTrack.name} by ${randomTrack.artists[0].name}`);
            } else {
                console.log('[DEBUG] No song argument provided, fetching a random track from the playlist...');
                let allTracks = [];
                let nextPage = null;

                do {
                    console.log('[DEBUG] Fetching playlist tracks...');
                    const playlistData = await spotifyApi.getPlaylistTracks(playlistId, {
                        limit: 100,
                        offset: nextPage ? allTracks.length : 0,
                    });

                    const tracks = playlistData.body.items;

                    if (tracks.length === 0) {
                        console.log('[ERROR] No tracks found in the playlist.');
                        return interaction.reply({ content: 'No tracks found in the playlist.' });
                    }

                    allTracks = allTracks.concat(tracks);
                    nextPage = playlistData.body.next;

                } while (nextPage);

                if (allTracks.length === 0) {
                    console.log('[ERROR] No tracks found in the playlist.');
                    return interaction.reply({ content: 'No tracks found in the playlist.' });
                }

                randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)].track;
                console.log(`[DEBUG] Random track selected: ${randomTrack.name} by ${randomTrack.artists[0].name}`);

                while (randomTrack.name === lastTrack) {
                    console.log('[DEBUG] Selected track is the same as the last one. Choosing a new one...');
                    randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)].track;
                }
            }

            if (!randomTrack) {
                console.log('[ERROR] Failed to select a track.');
                return interaction.reply({ content: 'Failed to select a track.' });
            }

            const songDuration = randomTrack.duration_ms;
            console.log(`[DEBUG] Setting activity to: ${randomTrack.name} by ${randomTrack.artists[0].name}`);
            client.user.setActivity(`${randomTrack.name} by ${randomTrack.artists[0].name}`, {
                type: 2,
                url: randomTrack.external_urls.spotify
            });

            const channel = client.channels.cache.get('1319595096244752494');
            if (channel) {
                console.log(`[DEBUG] Now listening to: ${randomTrack.name}`);
                await interaction.reply({ content: `Now listening to: ${randomTrack.name} by ${randomTrack.artists[0].name}` });
            }

            if (currentTimeout) {
                console.log('[DEBUG] Cancelling previous timeout due to new song request...');
                clearTimeout(currentTimeout);
            }

            currentTimeout = setTimeout(async () => {
                console.log('[DEBUG] Song has finished, switching to the next song...');
                if (!interaction.replied) {
                    console.log('[DEBUG] Replying to interaction...');
                    await interaction.reply({ content: 'Next song is playing now.' });
                }
                await this.execute(interaction, client);
            }, songDuration);

        } catch (error) {
            console.error('[ERROR] Error changing song:', error);
            return interaction.reply({ content: 'There was an error changing the song. Please try again later.' });
        }
    },
};
