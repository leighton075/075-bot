const { Client, GatewayIntentBits, Collection, AuditLogEvent, EmbedBuilder, InteractionResponseFlags } = require('discord.js');
const fs = require('fs');
const readline = require('readline');
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
        commands.set(command.data.name, command); // Use .set() here
    } catch (error) {
        console.error(`Error loading command file ${file}:`, error);
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.on('line', async (input) => {
    const args = input.trim().split(' ');
    const commandName = args.shift();

    const command = commands.get(commandName);
    if (!command) {
        console.log(`Unknown command: ${commandName}`);
        return;
    }

    try {
        if (commandName === 'ban') {
            const guildId = 'YOUR_GUILD_ID'; // Replace with your guild's ID
            const guild = await client.guilds.fetch(guildId);
            const userId = args[0];
            const reason = args.slice(1).join(' ') || 'No reason provided';

            if (!guild) {
                console.log('Guild not found.');
                return;
            }

            await command.execute(null, { guild, userId, reason });
        } else {
            console.log(`The "${commandName}" command is not configured for console use.`);
        }
    } catch (error) {
        console.error(`Error executing ${commandName}:`, error);
    }
});

client.on('ready', () => {
    console.log(`${client.user.tag} has logged in.`);
    console.log(`Loaded ${commandFiles.length} commands locally.`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({ content: 'Unknown command!', flags: 64 });
    }

    try {
        await command.execute(interaction, client); // Execute the command
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        interaction.reply({ content: 'An error occurred while executing this command.', flags: 64 });
    }
});

client.on('messageCreate', async (message) => {
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

    if (message.content.includes('test')) {
        console.log('Test command received');
        try {
            const fetchedLogs = await message.guild.fetchAuditLogs({
                type: AuditLogEvent.InviteCreate,
                limit: 1,
            });

            if (fetchedLogs.entries.size > 0) {
                const firstEntry = fetchedLogs.entries.first();

                const logDetails = `
                    Action: ${firstEntry.action}
                    Executor: ${firstEntry.executor.tag}
                    Target: ${firstEntry.target.tag || 'N/A'}
                    Reason: ${firstEntry.reason || 'No reason provided'}
                    Timestamp: ${firstEntry.createdAt.toISOString()}
                `;

                message.reply(`Audit log entry:\n${logDetails}`);
            } else {
                message.reply('No audit log entries found.');
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            message.reply('There was an error fetching the audit logs.');
        }
    }
});

client.on('guildMemberAdd', async (member) => {
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

client.on('guildMemberRemove', async (member) => {
    console.log(`${member.user.tag} has left the server!`);

    const joinChannel = member.guild.channels.cache.find(ch => ch.name === 'joins-bans');
    
    if (joinChannel) {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
            const banLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }); // 22 is the action type for 'MEMBER_BAN'

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

client.login(discordToken);