const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const querystring = require('querystring');

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('authorise')
        .setDescription('Authorises the bot to access your Spotify'),

    async execute(interaction) {
        console.debug(`Received authorisation request from ${interaction.user.tag} (ID: ${interaction.user.id})`);

        const authUrl = `https://accounts.spotify.com/authorize?${querystring.stringify({
            response_type: 'code',
            client_id: spotifyClientId,
            redirect_uri: spotifyRedirectUri,
            scope: 'user-top-read',
            state: interaction.user.id,
        })}`;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Spotify Authorisation')
            .setDescription(`Click this link to authorise the bot: [Authorise](${authUrl})`)
            .setFooter({ text: 'This link will allow the bot to read your top tracks.' });

        try {
            console.debug(`Attempting to send DM to ${interaction.user.tag}...`);
            await interaction.user.send({ embeds: [embed] });
            console.debug(`Successfully sent DM to ${interaction.user.tag}`);

            await interaction.reply({
                content: 'Sent you a DM with the authorisation link! 📩',
                ephemeral: true,
            });
        } catch (dmError) {
            console.error(`Error sending DM to ${interaction.user.tag}:`, dmError.message);
            await interaction.reply({
                content: "I couldn't DM you the authorisation link. Please check your privacy settings and try again.",
                ephemeral: true,
            });
        }
    },
};
