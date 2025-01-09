const { Client, GatewayIntentBits, Collection, AuditLogEvent, EmbedBuilder, Events } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const discordToken = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

const commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        if (!command.data || typeof command.data.toJSON !== 'function') {
            console.error(`Invalid command structure in file: ${file}`);
            continue;
        }
        commands.set(command.data.name, command);
    } catch (error) {
        console.error(`Error loading command file ${file}:`, error);
    }
}

client.on('ready', () => {
    console.log(`${client.user.tag} has logged in.`);
    console.log(`Loaded ${commandFiles.length} commands locally.`);
    client.user.setActivity('Listening to Good Kid', { type: 'LISTENING'});
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({ content: 'Unknown command!', ephemeral: true });
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
    }
});

client.on(Events.MessageCreate, async (message) => {
    const linkChannel = '1319595051160047627';
    if (message.author.bot) return;

    if (
        message.channel.id === linkChannel &&
        !message.content.includes('https://photos.app.goo.gl/')
    ) {
        message.delete()
            .then(() => console.log(`Deleted message from ${message.author.tag}`))
            .catch((error) => console.error('Failed to delete message:', error));
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`${member.user.tag} has joined the server!`);

    const joinChannel = member.guild.channels.cache.find(ch => ch.name === 'joins-bans');

    if (joinChannel) {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, actionType: 1 });
            const inviter = auditLogs.entries.first() ? auditLogs.entries.first().executor : null;

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`Welcome, ${member.user.username}!`)
                .setDescription(`Invited by ${inviter ? inviter.tag : 'Unknown'}`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                )
                .setFooter({ text: 'Im the biggest bird, not you', iconURL: member.guild.iconURL() })
                .setTimestamp();

            joinChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching audit logs:', error.message);
        }
    }
});

client.on(Events.GuildMemberRemove, async (member) => {
    console.log(`${member.user.tag} has left the server!`);

    const joinChannel = member.guild.channels.cache.find(ch => ch.name === 'joins-bans');

    if (joinChannel) {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
            const banLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });

            let embed;
            const kickEntry = auditLogs.entries.first();
            const banEntry = banLogs.entries.first();

            if (kickEntry && kickEntry.target.id === member.id) {
                embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${member.user.username} was kicked from the server`)
                    .setDescription(`Kicked by ${kickEntry.executor.tag}`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                    )
                    .setFooter({ text: 'Kicked by the server', iconURL: member.guild.iconURL() })
                    .setTimestamp();
            } else if (banEntry && banEntry.target.id === member.id) {
                embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${member.user.username} was banned from the server`)
                    .setDescription(`Banned by ${banEntry.executor.tag}`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                    )
                    .setFooter({ text: 'Banned by the server', iconURL: member.guild.iconURL() })
                    .setTimestamp();
            } else {
                embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${member.user.username} left the server`)
                    .setDescription(`${member.user.username} decided to leave the server.`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: 'User Info', value: `Username: ${member.user.tag}\nID: ${member.user.id}`, inline: true }
                    )
                    .setFooter({ text: 'Goodbye!', iconURL: member.guild.iconURL() })
                    .setTimestamp();
            }

            joinChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching audit logs:', error.message);
        }
    }
});

client.login(token);
