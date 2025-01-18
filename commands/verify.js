const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const mysql = require('mysql2');
const { createCanvas, loadImage, registerFont, } = require('canvas');
const fs = require('fs');
const path = require('path');

registerFont(path.join(__dirname, '..', 'fonts', 'Corinthia.ttf'), { family: 'Corinthia' });

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
        console.error(`[ERROR] Error connecting to the database in verify.js: ${err}`);
    } else {
        console.log(`[INFO] Connected to the mySQL database in verify.js.`);
    }
});

function generateCaptchaString(length = 5) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let captcha = '';
    for (let i = 0; i < length; i++) {
        captcha += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return captcha;
}

async function generateCaptchaImage(captchaText) {
    const canvas = createCanvas(300, 100);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`;
        ctx.beginPath();
        ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.font = 'bold 40px "Corinthia"';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(captchaText, canvas.width / 2, canvas.height / 2);

    return canvas.toBuffer();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your account by adding your user ID and username to the database'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        const captcha = generateCaptchaString();

        const captchaImageBuffer = await generateCaptchaImage(captcha);
        const captchaAttachment = new AttachmentBuilder(captchaImageBuffer, { name: 'captcha.png' });

        const embed = new EmbedBuilder()
            .setTitle('Account Verification')
            .setDescription('Please type the characters you see in the image below to verify your account.')
            .setColor('#cb668b')
            .setImage('attachment://captcha.png');

        await interaction.reply({ embeds: [embed], files: [captchaAttachment] });

        const filter = (message) => message.author.id === userId && message.content === captcha;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000 }); // 30 seconds timeout

        collector.on('collect', (message) => {
            collector.stop();

            const checkQuery = 'SELECT * FROM verification WHERE user_id = ?';
            db.query(checkQuery, [userId], (err, result) => {
                if (err) {
                    console.error(`[ERROR] Error checking user in the database: ${err}`);
                    return message.reply('There was an error verifying your account.');
                }

                if (result.length > 0) {
                    const existingUsername = result[0].username;

                    if (existingUsername !== username) {
                        const updateQuery = 'UPDATE verification SET username = ? WHERE user_id = ?';
                        db.query(updateQuery, [username, userId], (updateErr) => {
                            if (updateErr) {
                                console.error(`[ERROR] Error updating username: ${updateErr}`);
                                return message.reply('There was an error updating your username.');
                            }
                            message.reply('Your username has been updated in the database.');
                        });
                    } else {
                        message.reply('Your user ID and username are already in the database.');
                    }
                } else {
                    const insertQuery = 'INSERT INTO verification (user_id, username) VALUES (?, ?)';
                    db.query(insertQuery, [userId, username], (insertErr) => {
                        if (insertErr) {
                            console.error(`[ERROR] Error adding user to the database: ${insertErr}`);
                            return message.reply('There was an error adding your account to the database.');
                        }
                        message.reply('Your user ID and username have been added to the verification database.');
                    });
                }
            });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.followUp('Verification failed: you did not reply with the correct CAPTCHA in time.');
            }
        });
    },
};
