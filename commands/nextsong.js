const { SlashCommandBuilder } = require('discord.js');
const SpotifyWebApi = require('spotify-web-api-node');

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
        console.log('[DEBUG] Spotify access token acquired.');
    } catch (err) {
        console.error('[ERROR] Error getting Spotify access token:', err);
    }
}

let lastTrack = null;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listento')
        .setDescription('Change the song the bot is listening to.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('playlist')
                .setDescription('Which playlist to listen to')
                .addStringOption(option =>
                    option.setName('playlistid')
                        .setDescription('Id of the playlist to listen to')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('song')
                .setDescription('Song from the current playlist to listen to')
                .addStringOption(option =>
                    option.setName('song')
                        .setDescription('Song to play')
                        .setRequired(true))),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'playlistid') {
            console.log('[DEBUG] Autocomplete triggered for playlistid');
            await authenticateSpotify();
            const playlists = await spotifyApi.getUserPlaylists();
            const playlistChoices = playlists.body.items.map(item => ({
                name: item.name,
                value: item.id,
            }));

            const filteredPlaylists = playlistChoices.filter(playlist =>
                playlist.name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );

            console.log('[DEBUG] Returning filtered playlists:', filteredPlaylists);
            await interaction.respond(filteredPlaylists);
        }
    },

    async execute(interaction, client) {
        try {
            console.log('[DEBUG] Execute command triggered.');
            const playlistId = interaction.options.getString('playlistid');
            console.log('[DEBUG] Selected Playlist ID:', playlistId);
            await authenticateSpotify();

            let allTracks = [];
            let nextPage = null;

            // Fetch all tracks from the playlist
            do {
                const playlistData = await spotifyApi.getPlaylistTracks(playlistId, {
                    limit: 100,
                    offset: nextPage ? allTracks.length : 0,
                });

                const tracks = playlistData.body.items;
                if (tracks.length === 0) {
                    console.log('[DEBUG] No tracks found in the playlist.');
                    return interaction.reply({ content: 'No tracks found in the playlist.' });
                }

                allTracks = allTracks.concat(tracks);
                nextPage = playlistData.body.next;
            } while (nextPage);

            console.log('[DEBUG] Tracks fetched:', allTracks.length);
            if (allTracks.length === 0) {
                return interaction.reply({ content: 'No tracks found in the playlist.' });
            }

            // Prepare song choices
            const songChoices = allTracks.map(item => ({
                name: item.track.name,
                value: item.track.id,
            }));
            console.log('[DEBUG] Song choices prepared:', songChoices.length);

            // Get the song from the interaction
            const songName = interaction.options.getString('song');
            console.log('[DEBUG] Selected song name:', songName);

            if (!songName) {
                console.log('[ERROR] No song name provided.');
                return interaction.reply({ content: 'Please specify a song name to play.' });
            }

            const song = allTracks.find(track => track.track.name.toLowerCase() === songName.toLowerCase());

            if (!song) {
                console.log('[ERROR] Song not found in the playlist.');
                return interaction.reply({ content: 'The song you specified was not found in the playlist.' });
            }

            // Set bot's activity to the selected song
            const track = song.track;
            client.user.setActivity(`${track.name} by ${track.artists[0].name}`, {
                type: 2,
                url: track.external_urls.spotify
            });

            console.log('[DEBUG] Now playing:', track.name);
            const channel = client.channels.cache.get('1319595096244752494');
            if (channel) {
                return interaction.reply({ content: `Now listening to: ${track.name} by ${track.artists[0].name}` });
            }

            return interaction.reply({ content: 'Failed to find a channel to send the track info.' });

        } catch (error) {
            console.error('[ERROR] Error changing song:', error);
            return interaction.reply({ content: 'There was an error changing the song. Please try again later.' });
        }
    },
};
