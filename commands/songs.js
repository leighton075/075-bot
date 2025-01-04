// In songs.js file
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const querystring = require('querystring');

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('songs')
        .setDescription('Display top songs for 1, 6, or 12 months')
        .addIntegerOption(option =>
            option.setName('months')
                .setDescription('Time range in months')
                .setRequired(true)),

    async execute(interaction) {
        const months = interaction.options.getInteger('months');

        // Validate months input
        if (![1, 6, 12].includes(months)) {
            return interaction.reply("Please enter a valid value: 1, 6, or 12 months.");
        }

        // Retrieve user data from MongoDB
        let user;
        try {
            user = await User.findOne({ discordId: interaction.user.id });
        } catch (err) {
            console.error("Error fetching user data:", err);
            return interaction.reply('There was an error retrieving your data. Please try again later.');
        }

        if (!user || !user.accessToken) {
            return interaction.reply('You need to authorize the bot first using the `/authorise` command.');
        }

        let accessToken = user.accessToken;
        let timeRange;

        switch (months) {
            case 1: timeRange = 'short_term'; break;
            case 6: timeRange = 'medium_term'; break;
            case 12: timeRange = 'long_term'; break;
        }

        try {
            // Attempt to fetch top songs from Spotify
            let topSongsResponse = await axios.get(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            // Check if the access token is expired and refresh it
            if (topSongsResponse.status === 401 && user.refreshToken) {
                console.log('Token expired, attempting to refresh...');
                const refreshResponse = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: user.refreshToken,
                }), {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });

                accessToken = refreshResponse.data.access_token;

                // Save new tokens to the database
                await User.findOneAndUpdate({ discordId: interaction.user.id }, { accessToken: accessToken, refreshToken: refreshResponse.data.refresh_token });

                // Retry fetching top songs with the new access token
                topSongsResponse = await axios.get(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                });
            }

            // Extract top songs (limit to top 10)
            const topSongs = topSongsResponse.data.items.slice(0, 10);
            if (!topSongs || topSongs.length === 0) {
                return interaction.reply("No songs found. Please try again later.");
            }

            const songList = topSongs.map((song, index) => {
                let position = '';
                if (index === 0) position = '🥇';
                else if (index === 1) position = '🥈';
                else if (index === 2) position = '🥉';
                else position = `${index + 1}.`;

                return `${position} **${song.name}** \nby ${song.artists.map(artist => artist.name).join(', ')}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#1DB954')
                .setTitle(`${months}-Month Top Songs`)
                .setDescription(songList);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching top songs:', error);
            await interaction.reply('There was an error fetching your top songs. Please try again later.');
        }
    },
};
