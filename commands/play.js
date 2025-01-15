const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// ==========================
//        mySQL Setup
// ==========================
const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: 'bot_verification'
});

db.connect((err) => {
    if (err) {
        console.error(`[ERROR] Error connecting to the database: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database.`);
    }
});

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
                    interaction.followUp({ content: `Now playing: ${sound}`, ephemeral: true });
                    hasReplied = true;
                }
            });

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                connection.destroy();
            });

        } catch (error) {
            return interaction.followUp({ content: `There was an error playing the sound:v${error}`, ephemeral: true });
        }
    },
};
