const { SlashCommandBuilder } = require('discord.js');
const ytdl = require('ytdl-core');
const { google } = require('googleapis');
const youtube = google.youtube('v3');
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
                    option.setName('url')
                        .setDescription('YouTube video URL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Get information for a channel')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('YouTube channel URL')
                        .setRequired(true))),
        
    async execute(interaction) {
        const url = interaction.options.getString('url');
        const subcommand = interaction.options.getSubcommand();
        console.log(`Received URL: ${url}`);
        console.log(`Subcommand: ${subcommand}`);

        function formatDuration(duration) {
            const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        
            if (!matches) return "Unknown duration";
        
            const hours = matches[1] ? `${matches[1]} hour${matches[1] > 1 ? 's' : ''}` : "";
            const minutes = matches[2] ? `${matches[2]} minute${matches[2] > 1 ? 's' : ''}` : "";
            const seconds = matches[3] ? `${matches[3]} second${matches[3] > 1 ? 's' : ''}` : "";

            return [hours, minutes, seconds].filter(Boolean).join(", ");
        }

        if (subcommand === 'video') {
            try {
                console.log('Fetching video information...');
                const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)|youtu\.be\/([0-9A-Za-z_-]{11})/);
                if (!videoIdMatch) {
                    console.error('Invalid YouTube video URL:', url);
                    return interaction.reply({ content: 'Invalid YouTube video URL.', ephemeral: true });
                }

                const videoId = videoIdMatch[1] || videoIdMatch[2];
                console.log(`Extracted Video ID: ${videoId}`);
        
                const response = await youtube.videos.list({
                    key: youtubeApiKey,
                    part: 'snippet,statistics,contentDetails',
                    id: videoId,
                });
        
                const video = response.data.items[0];
                if (!video) {
                    console.error('Video not found for ID:', videoId);
                    return interaction.reply({ content: 'Video not found.', ephemeral: true });
                }
        
                const formattedDuration = formatDuration(video.contentDetails.duration);

                console.log('Video information retrieved successfully:', video);
                return interaction.reply({
                    embeds: [{
                        title: video.snippet.title,
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        description: video.snippet.description.substring(0, 200) + '...',
                        fields: [
                            { name: 'Channel', value: video.snippet.channelTitle, inline: true },
                            { name: 'Duration', value: formattedDuration, inline: true },
                            { name: 'Views', value: video.statistics.viewCount, inline: true },
                        ],
                        thumbnail: { url: video.snippet.thumbnails.high.url },
                    }]
                });
            } catch (error) {
                console.error('Error fetching video information:', error);
                return interaction.reply({ content: 'An error occurred while fetching video information.', ephemeral: true });
            }
        }

        if (subcommand === 'channel') {
            try {
                console.log('Fetching channel information...');
                let channelId = null;
        
                if (url.includes('@')) {
                    const usernameMatch = url.match(/@([^/?]+)/);
                    if (usernameMatch) {
                        const username = usernameMatch[1];
                        console.log(`Extracted Username: ${username}`);
        
                        const searchResponse = await youtube.search.list({
                            key: youtubeApiKey,
                            part: 'snippet',
                            q: username,
                            type: 'channel',
                        });
        
                        const channelItem = searchResponse.data.items[0];
                        if (channelItem) {
                            channelId = channelItem.id.channelId;
                        }
                    }
                } else {
                    const channelIdMatch = url.match(/(channel\/|user\/|c\/)([^/?]+)/);
                    if (channelIdMatch) {
                        channelId = channelIdMatch[2];
                        console.log(`Extracted Channel ID: ${channelId}`);
                    }
                }
        
                if (!channelId) {
                    console.error('Could not extract a valid channel identifier from the URL:', url);
                    return interaction.reply({ content: 'Invalid YouTube channel URL.', ephemeral: true });
                }
        
                const response = await youtube.channels.list({
                    key: youtubeApiKey,
                    part: 'snippet,statistics',
                    id: channelId,
                });
        
                const channel = response.data.items[0];
                if (!channel) {
                    console.error('Channel not found for ID:', channelId);
                    return interaction.reply({ content: 'Channel not found.', ephemeral: true });
                }
        
                console.log('Channel information retrieved successfully:', channel);
                return interaction.reply({
                    embeds: [{
                        title: channel.snippet.title,
                        description: channel.snippet.description.substring(0, 200) + '...',
                        fields: [
                            { name: 'Subscribers', value: channel.statistics.subscriberCount, inline: true },
                            { name: 'Total Views', value: channel.statistics.viewCount, inline: true },
                            { name: 'Videos', value: channel.statistics.videoCount, inline: true },
                        ],
                        thumbnail: { url: channel.snippet.thumbnails.high.url },
                    }]
                });
            } catch (error) {
                console.error('Error fetching channel information:', error);
                return interaction.reply({ content: 'An error occurred while fetching channel information.', ephemeral: true });
            }
        }        
    },
};
