const { SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oliver')
        .setDescription('For when the server goes to shit'),

    async execute(interaction) {
        console.log('Oliver mode has been enabled');
        const imTheBiggestBird = '1087890340792512603';
        const channelDetails = [];

        if (interaction.user.id !== imTheBiggestBird) {
            return interaction.reply({ content: "You are not the biggest bird", flags: 64 });
        }

        const guild = interaction.guild;
        if (!guild) {
            return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
        }

        try {
            for (const channel of guild.channels.cache.values()) {
                if (channel.type === ChannelType.PublicThread) {
                    continue;
                }

                channelDetails.push({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                });
            }

            channelDetails.sort((a, b) => {
                const typeOrder = {
                    [ChannelType.GuildCategory]: 1,
                    [ChannelType.GuildText]: 2,
                    [ChannelType.GuildVoice]: 3,
                };
                return typeOrder[a.type] - typeOrder[b.type];
            });

            channelDetails.forEach(channel => {
                console.log(`ID: ${channel.id}, Name: ${channel.name}, Type: ${ChannelType[channel.type] || 'Unknown'}`);
            });

        } catch (error) {
            console.error('Error getting channels:', error);
            return interaction.reply({ content: 'There was an error with the command.', flags: 64 });
        }

        return interaction.reply({ content: `It worked! Collected ${channelDetails.length} channels from this server (excluding ignored types).` });
    },
};
