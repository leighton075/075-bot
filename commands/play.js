const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a sound')
        .addStringOption(option => option
            .setName('sound')
            .setDescription('Sound to play')
            .setRequired(true)
            .addChoices(
                { name: 'bruh', value: 'bruh' },
            )),

    async execute(interaction) {
        const sound = interaction.options.getString('sound');
        const voiceChannel = interaction.member.voice.channel;
        let hasReplied = false;

        // Check if the user is in a voice channel
        if (!voiceChannel) {
            return interaction.reply({ content: 'You need to join a voice channel first!', ephemeral: true });
        }

        try {
            await interaction.deferReply();

            // Join the voice channel
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // Set the file path for the sound
            const filePath = path.resolve(__dirname, '../sounds', `${sound}.mp3`);

            // Check if the sound file exists
            if (!fs.existsSync(filePath)) {
                console.error('File not found:', filePath);
                return interaction.followUp({ content: 'Sound file not found.', ephemeral: true });
            }

            // Create and play the audio resource
            const resource = createAudioResource(fs.createReadStream(filePath));
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            // Send a message when the sound starts playing
            player.on(AudioPlayerStatus.Playing, () => {
                if (!hasReplied) {
                    interaction.followUp({ content: `Now playing: ${sound}`, ephemeral: true });
                    hasReplied = true;
                }
            });

            // Cleanup once the audio has finished playing
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                connection.destroy();
            });

        } catch (error) {
            return interaction.followUp({ content: `There was an error playing the sound: ${error}`, ephemeral: true });
        }
    },
};
