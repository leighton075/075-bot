const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage roles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Assign a role to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to assign the role')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
            }

            if (!user) {
                return interaction.reply({ content: 'User does not exist.', flags: 64});
            }

            if (!role) {
                return interaction.reply({ content: 'Role does not exist.', flags: 64});
            }

            try {
                const guild = interaction.guild;
                const member = await guild.members.fetch(user.id);

                if (member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${user.tag} already has the ${role.name} role.`, flags: 64 });
                }

                await member.roles.add(role);
                return interaction.reply({ content: `Added the ${role.name} role to ${member.user.tag}` });
            } catch (error) {
                console.error('Error adding role:', error);
                return interaction.reply({ content: 'There was an error adding the role.', flags: 64 });
            }
        }

        if (subcommand === 'remove') {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
            }

            if (!user) {
                return interaction.reply({ content: 'User does not exist.', flags: 64});
            }

            if (!role) {
                return interaction.reply({ content: 'Role does not exist.', flags: 64});
            }

            try {
                const guild = interaction.guild;
                const member = await guild.members.fetch(user.id);

                if (!member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${user.tag} does not have the ${role.name} role.`, flags: 64 });
                }

                await member.roles.remove(role);
                return interaction.reply({ content: `Removed the ${role.name} role from ${member.user.tag}` });
            } catch (error) {
                console.error('Error removing role:', error);
                return interaction.reply({ content: 'There was an error removing the role.', flags: 64 });
            }
        }
    },
};
