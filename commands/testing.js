const { SlashCommandBuilder } = require('discord.js');
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
        console.log(`[INFO] Connected to the mySQL database in testing.js.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testing')
        .setDescription('For bot testing')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user that will get the role')
                .setRequired(true))
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role the user will get')
                .setRequired(true)),

    async execute(interaction) {
        const imTheBiggestBird = '1087890340792512603';  
        if (interaction.user.id !== imTheBiggestBird) {
            return interaction.reply("You are not the biggest bird");
        }

        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');

        if (!user) {
            return interaction.reply({ content: 'User not found. Please mention a valid user.', ephemeral: true });
        }

        if (!role) {
            return interaction.reply({ content: 'Role not found. Please select a valid role.', ephemeral: true });
        }
        
        try {
            const guild = interaction.guild;
            if (!guild) {
                return interaction.reply({ content: 'This command must be run in a server.', ephemeral: true });
            }

            const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id).catch(() => null);
            if (!member) {
                return interaction.reply({ content: 'Member not found. Ensure the user is part of this server.', ephemeral: true });
            }

            if (!role) {
                return interaction.reply({ content: 'Role not found', ephemeral: true})
            }

            await member.roles.add(role)
            console.log(`Assigned role ${role.name} to ${member.user.tag}`);
            return interaction.reply({ content: `Gave the ${role.name} role to ${member.user.tag}`});
        } catch (error) {
            console.error('Error adding role to member:', error);
            return interaction.reply({ content: 'There was an error giving a member a role', ephemeral: true})
        }
    },
};
