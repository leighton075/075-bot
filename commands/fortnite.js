const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
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
        console.error(`[ERROR] Error connecting to the database in fortnite.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in fortnite.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fortnite')
        .setDescription('Commands for Fortnite')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Status of the Fortnite servers'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Get the stats for a player')
                .addStringOption(option =>
                    option
                        .setName('player')
                        .setDescription('Fortnite username')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // Verify user in database
        const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
        db.query(checkQuery, [userId], async (err, result) => {
            if (err) {
                console.error(`[ERROR] Error checking user in the database: ${err}`);
                return interaction.reply('There was an error processing your request.');
            }

            if (result.length > 0) {
                // User is verified, proceed with the command
                if (subcommand === 'status') {
                    try {
                        const statusResponse = await axios.get('https://status.epicgames.com/api/v2/status.json');
                        const statusData = statusResponse.data;

                        const maintenanceResponse = await axios.get('https://status.epicgames.com/api/v2/scheduled-maintenances/upcoming.json');
                        const maintenanceData = maintenanceResponse.data;

                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle('Fortnite Status and Upcoming Maintenance')
                            .setDescription('Current system status and next scheduled maintenance.');

                        const currentStatus = statusData.status.description;
                        embed.addFields(
                            { name: 'Current Status', value: currentStatus, inline: false }
                        );

                        if (maintenanceData.scheduled_maintenances.length > 0) {
                            const nextMaintenance = maintenanceData.scheduled_maintenances[0];
                            const maintenanceName = nextMaintenance.name;
                            const scheduledFor = new Date(nextMaintenance.scheduled_for).toLocaleString();
                            const impact = nextMaintenance.impact;

                            embed.addFields(
                                { name: 'Next Scheduled Maintenance', value: `${maintenanceName}\nScheduled for: ${scheduledFor}\nImpact: ${impact}`, inline: false }
                            );
                        } else {
                            embed.addFields(
                                { name: 'Next Scheduled Maintenance', value: 'No upcoming maintenance scheduled.', inline: false }
                            );
                        }

                        await interaction.reply({ embeds: [embed] });
                    } catch (error) {
                        await interaction.reply({ content: `Failed to fetch Fortnite status or maintenance info: ${error.message}` });
                    }
                }

                if (subcommand === 'stats') {
                    const playerName = interaction.options.getString('player');

                    if (!playerName) {
                        return interaction.reply({ content: 'Please provide a valid Fortnite username.', ephemeral: true });
                    }

                    try {
                        const response = await axios.get(`https://fortnite-api.com/v2/stats/br/v2?name=${playerName}&accountType=epic`, {
                            headers: {
                                Authorization: process.env.FORTNITE_API_KEY,
                            },
                        });

                        const statsData = response.data;

                        if (!statsData.data || !statsData.data.stats || !statsData.data.stats.all) {
                            throw new Error('Stats data is missing or in incorrect format');
                        }

                        const overallStats = statsData.data.stats.all.overall;

                        if (!overallStats) {
                            throw new Error('Overall stats data is missing for this player');
                        }

                        const embed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle(`${playerName}'s Fortnite Battle Royale Overall Stats`)
                            .setDescription('Skill issue')
                            .setFooter({ text: 'Powered by me (with a little help from fortnite-api.com)' });

                        embed.addFields(
                            { name: 'Wins', value: overallStats.wins !== undefined ? overallStats.wins.toString() : 'N/A', inline: true },
                            { name: 'Top 3', value: overallStats.top3 !== undefined ? overallStats.top3.toString() : 'N/A', inline: true },
                            { name: 'Kills', value: overallStats.kills !== undefined ? overallStats.kills.toString() : 'N/A', inline: true },
                            { name: 'K/D Ratio', value: overallStats.kd !== undefined ? overallStats.kd.toFixed(2) : 'N/A', inline: true },
                            { name: 'Matches Played', value: overallStats.matches !== undefined ? overallStats.matches.toString() : 'N/A', inline: true },
                            { name: 'Win Rate', value: overallStats.winRate !== undefined ? `${overallStats.winRate.toFixed(2)}%` : 'N/A', inline: true },
                            { name: 'Minutes Played', value: overallStats.minutesPlayed !== undefined ? overallStats.minutesPlayed.toString() : 'N/A', inline: true },
                            { name: 'Players Outlived', value: overallStats.playersOutlived !== undefined ? overallStats.playersOutlived.toString() : 'N/A', inline: true }
                        );

                        await interaction.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Error fetching player stats:', error.message);
                        await interaction.reply({ content: `Failed to fetch player stats for ${playerName}: ${error.message}` });
                    }
                }
            } else {
                // User is not verified
                return interaction.reply('You need to verify your account first. Please verify your account using `/verify`.');
            }
        });
    },
};