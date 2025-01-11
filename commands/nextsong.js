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
        .setName('nextsong')
        .setDescription('Change the song the bot is listening to.'),

    async execute(interaction) {
        try {
            const playlistId = '210tfDJT6HnJeGwyg01dBd';
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

            lastTrack = randomTrack.name;

            const trackImage = randomTrack.album.images[0].url;
            const trackUrl = randomTrack.external_urls.spotify;

            const channel = client.channels.cache.get('1319595096244752494');
            if (channel) {
                channel.send({
                    embeds: [{
                        title: randomTrack.name,
                        description: `Now listening to: ${randomTrack.name} by ${randomTrack.artists[0].name}`,
                        url: trackUrl,
                        image: { url: trackImage },
                        footer: {
                            text: 'Listen on Spotify',
                            icon_url: 'https://i.scdn.co/image/ab6761610000e5eb62b311a0a9ecf97a2f80ddb8',
                        },
                    }]
                });

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
