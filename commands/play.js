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
                { name: 'N in my dick hole', value: 'n_in_my_dick_hole' },
            )),

    async execute(interaction) {
        const sound = interaction.options.getString('sound');
        const voiceChannel = interaction.member.voice.channel;
        let hasReplied = false;

        if (!voiceChannel) {
            return interaction.reply({ content: 'You need to join a voice channel first!', ephemeral: true });
        }

        try {
            await interaction.deferReply();

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const filePath = path.resolve(__dirname, '../sounds', `${sound}.mp3`);

            console.log(`Attempting to play sound from: ${filePath}`);

            if (!fs.existsSync(filePath)) {
                console.error('File not found:', filePath);
                return interaction.followUp({ content: 'Sound file not found.', ephemeral: true });
            }

            const resource = createAudioResource(fs.createReadStream(filePath));
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Playing, () => {
                if (!hasReplied) {
                    console.log('Audio is now playing.');
                    interaction.followUp({ content: `Now playing: ${sound}`, ephemeral: false });
                    hasReplied = true;
                }
            });

            player.on(AudioPlayerStatus.Idle, () => {
                console.log('Audio finished, leaving the channel.');
                connection.destroy();
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                console.log('Disconnected from the voice channel.');
                connection.destroy();
            });

        } catch (error) {
            console.error('Error occurred during audio playback:', error);
            return interaction.followUp({ content: 'There was an error playing the sound.', ephemeral: true });
        }
    },
};
