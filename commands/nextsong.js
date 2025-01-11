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
        console.log('Spotify access token acquired.');
    } catch (err) {
        console.error('Error getting Spotify access token:', err);
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
                        .setRequired(false)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('song')
                .setDescription('Song from the current playlist to listen to')
                .addStringOption(option =>
                    option.setName('song')
                        .setDescription('song to play')
                        .setRequired(true)))
                        .addChoices([]),

    async autocomplete(interaction) {
        const focusedOption = interaction.option.getFocused(true);

        if (focusedOption.name === 'playlistId') {
            await authenticateSpotify();
            const playlists = await spotifyApi.getUserPlaylists();
            const playlistChoices = playlists.body.items.map(item => ({
                name: item.name,
                value: item.id,
            }));

            const filteredPlaylists = playlistChoices.filter(playlist =>
                playlist.name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );

            await interaction.respond(filteredPlaylists);
        }
    },

    async execute(interaction, client) {
        try {
            const playlistId = interaction.options.getString('playlistid');
            await authenticateSpotify();

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

            const songChoices = allTracks.map(item => ({
                name: item.track.name,
                value: item.track.id,
            }));

            const songOption = interaction.options.get('song');
            songOption.choices = songChoices;

            let randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)].track;

            while (randomTrack.name === lastTrack) {
                randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)].track;
            }

            if (!randomTrack) {
                return interaction.reply({ content: 'Failed to select a random track.' });
            }

            client.user.setActivity(`${randomTrack.name} by ${randomTrack.artists[0].name}`, {
                type: 2,
                url: randomTrack.external_urls.spotify
            });

            const channel = client.channels.cache.get('1319595096244752494');
            if (channel) {
                console.log(`[INFO] Now listening to: ${randomTrack.name}`);
                return interaction.reply({ content: `Now listening to: ${randomTrack.name} by ${randomTrack.artists[0].name}` });
            }

            return interaction.reply({ content: 'Failed to find a channel to send the track info.' });

        } catch (error) {
            console.error('Error changing song:', error);
            return interaction.reply({ content: 'There was an error changing the song. Please try again later.' });
        }
    },
};
