const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const youtubeApiKey = process.env.YOUTUBE_API_KEY;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('Commands for YouTube')
        .addSubcommand(subcommand =>
            subcommand
                .setName('video')
                .setDescription('Get information for a video')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('YouTube video URL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Get information for a channel')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('YouTube channel URL')
                        .setRequired(true))),

    async execute(interaction) {
        // Check if API key is available
        if (!youtubeApiKey) {
            console.error('YouTube API key is not configured');
            return interaction.reply({ 
                content: 'YouTube functionality is currently unavailable. Ping me to fix it.', 
                ephemeral: false
            });
        }

        const url = interaction.options.getString('url');
        const subcommand = interaction.options.getSubcommand();

        function formatDuration(duration) {
            const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!matches) return "Unknown duration";

            const hours = matches[1] ? `${matches[1]} hour${matches[1] > 1 ? 's' : ''}` : "";
            const minutes = matches[2] ? `${matches[2]} minute${matches[2] > 1 ? 's' : ''}` : "";
            const seconds = matches[3] ? `${matches[3]} second${matches[3] > 1 ? 's' : ""}` : "";

            return [hours, minutes, seconds].filter(Boolean).join(", ");
        }

        if (subcommand === 'video') {
            try {
                const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)|youtu\.be\/([0-9A-Za-z_-]{11})/);
                if (!videoIdMatch) {
                    return interaction.reply({ content: 'Invalid YouTube video URL.', ephemeral: true });
                }

                const videoId = videoIdMatch[1] || videoIdMatch[2];
                const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        key: youtubeApiKey,
                        part: 'snippet,statistics,contentDetails',
                        id: videoId
                    }
                });

                if (response.data.items.length === 0) {
                    return interaction.reply({ content: 'Video not found.', ephemeral: true });
                }

                const video = response.data.items[0];
                const formattedDuration = formatDuration(video.contentDetails.duration);
                
                const embed = new EmbedBuilder()
                    .setTitle(video.snippet.title)
                    .setURL(`https://www.youtube.com/watch?v=${videoId}`)
                    .setDescription(video.snippet.description.substring(0, 200) + (video.snippet.description.length > 200 ? '...' : ''))
                    .addFields(
                        { name: 'Channel', value: video.snippet.channelTitle, inline: true },
                        { name: 'Duration', value: formattedDuration, inline: true },
                        { name: 'Views', value: parseInt(video.statistics.viewCount).toLocaleString(), inline: true }
                    )
                    .setThumbnail(video.snippet.thumbnails.high.url)
                    .setColor('#FF0000');

                return interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('YouTube API Error:', error.response?.data || error.message);
                
                let errorMessage = 'An error occurred while fetching video information.';
                if (error.response?.status === 403) {
                    errorMessage = 'YouTube API access denied. This might be due to invalid API key or quota limits.';
                } else if (error.response?.status === 404) {
                    errorMessage = 'Video not found.';
                }

                return interaction.reply({ 
                    content: errorMessage, 
                    ephemeral: true 
                });
            }
        }

        if (subcommand === 'channel') {
            try {
                let channelId = null;

                if (url.includes('@')) {
                    const usernameMatch = url.match(/@([^/?]+)/);
                    if (usernameMatch) {
                        const username = usernameMatch[1];
                        const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                            params: {
                                key: youtubeApiKey,
                                part: 'snippet',
                                q: username,
                                type: 'channel',
                                maxResults: 1
                            }
                        });

                        if (searchResponse.data.items.length > 0) {
                            channelId = searchResponse.data.items[0].id.channelId;
                        }
                    }
                } else {
                    const channelIdMatch = url.match(/(channel\/|user\/|c\/)([^/?]+)/);
                    if (channelIdMatch) {
                        channelId = channelIdMatch[2];
                    }
                }

                if (!channelId) {
                    return interaction.reply({ content: 'Invalid YouTube channel URL.', ephemeral: true });
                }

                const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                    params: {
                        key: youtubeApiKey,
                        part: 'snippet,statistics',
                        id: channelId
                    }
                });

                if (response.data.items.length === 0) {
                    return interaction.reply({ content: 'Channel not found.', ephemeral: true });
                }

                const channel = response.data.items[0];
                const embed = new EmbedBuilder()
                    .setTitle(channel.snippet.title)
                    .setDescription(channel.snippet.description.substring(0, 200) + (channel.snippet.description.length > 200 ? '...' : ''))
                    .addFields(
                        { name: 'Subscribers', value: parseInt(channel.statistics.subscriberCount).toLocaleString(), inline: true },
                        { name: 'Total Views', value: parseInt(channel.statistics.viewCount).toLocaleString(), inline: true },
                        { name: 'Videos', value: parseInt(channel.statistics.videoCount).toLocaleString(), inline: true }
                    )
                    .setThumbnail(channel.snippet.thumbnails.high.url)
                    .setColor('#FF0000');

                return interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('YouTube API Error:', error.response?.data || error.message);
                
                let errorMessage = 'An error occurred while fetching channel information.';
                if (error.response?.status === 403) {
                    errorMessage = 'YouTube API access denied. This might be due to invalid API key or quota limits.';
                } else if (error.response?.status === 404) {
                    errorMessage = 'Channel not found.';
                }

                return interaction.reply({ 
                    content: errorMessage, 
                    ephemeral: true 
                });
            }
        }
    },
};