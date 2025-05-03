const { SlashCommandBuilder } = require('discord.js');
const db = require('../db'); // Make sure you have db.js in your root directory

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cs2')
        .setDescription('Get CS2 stats for a Steam player')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Get CS2 stats for a Steam player')
                .addStringOption(option =>
                    option
                        .setName('player')
                        .setDescription('Steam username')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('link')
                .setDescription('Link your Discord account to a Steam account')
                .addStringOption(option =>
                    option
                        .setName('steamprofile')
                        .setDescription('Your Steam profile URL')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setsharecode')
                .setDescription('Set your CS2 match share code')
                .addStringOption(option =>
                    option
                        .setName('sharecode')
                        .setDescription('Your match share code')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Check your linked Steam account and match share code')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'stats') {
            // Implement stats fetch logic
        }

        if (subcommand === 'link') {
            const steamProfile = interaction.options.getString('steamprofile');
            const steamIdMatch = steamProfile.match(/steamcommunity\.com\/profiles\/(\d+)/);

            if (!steamIdMatch) {
                return await interaction.reply({
                    content: 'Invalid Steam profile URL. Please provide a valid URL in the format https://steamcommunity.com/profiles/<steamid>.'
                });
            }

            const steamId = steamIdMatch[1];

            await db.execute(
                'REPLACE INTO `steam-data` (discord_id, steam_id) VALUES (?, ?)',
                [userId, steamId]
            );

            await interaction.reply({
                content: `Your Steam account with ID ${steamId} has been linked to your Discord account.`
            });
        }

        if (subcommand === 'setsharecode') {
            const shareCode = interaction.options.getString('sharecode');

            const [rows] = await db.execute(
                'SELECT * FROM `steam-data` WHERE discord_id = ?',
                [userId]
            );

            if (rows.length === 0) {
                return await interaction.reply({
                    content: 'You need to link your Steam account first using `/cs2 link <steam profile url>`.'
                });
            }

            await db.execute(
                'UPDATE `steam-data` SET share_code = ? WHERE discord_id = ?',
                [shareCode, userId]
            );

            await interaction.reply({
                content: `Your match share code has been set to: ${shareCode}`
            });
        }

        if (subcommand === 'test') {
            const [rows] = await db.execute(
                'SELECT * FROM `steam-data` WHERE discord_id = ?',
                [userId]
            );

            if (rows.length === 0) {
                return await interaction.reply({
                    content: 'You have not linked a Steam account yet. Please use `/cs2 link <steam profile url>` to link your account.'
                });
            }

            const steamId = rows[0].steam_id || 'Not set';
            const shareCode = rows[0].share_code || 'Not set';

            if (shareCode === 'Not set') {
                return await interaction.reply({
                    content: `Your Steam account ID is: ${steamId}\nYour match share code is: ${shareCode}\n\nIt looks like you haven't set a match share code yet. Please visit [this link](https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128) to get it.`
                });
            }

            await interaction.reply({
                content: `Your Steam account ID is: ${steamId}\nYour match share code is: ${shareCode}`
            });
        }
    },
};
