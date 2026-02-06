const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_BASE = 'https://helldiverstrainingmanual.com/api/v1';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('helldivers')
        .setDescription('Helldivers 2 info from the Helldivers Training Manual API')
        .addSubcommand(sub =>
            sub.setName('map')
                .setDescription('Show a real-time galaxy map with active planets, liberation trends, and player counts'))
        .addSubcommand(sub =>
            sub.setName('updates')
                .setDescription('Show the latest Helldivers game update/news'))
        .addSubcommand(sub =>
            sub.setName('alert')
                .setDescription('Set up an alert for new Helldivers game updates in this channel'))
        .addSubcommand(sub =>
            sub.setName('testalert')
                .setDescription('Force a Helldivers update notification in the alert channel (for testing)')),

    async execute(interaction) {
        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();

        try {
            if (sub === 'testalert') {
                // Force send the latest update to the alert channel, even if not new
                const fs = require('fs');
                const path = require('path');
                const alertFile = path.join(__dirname, '../helldivers_alert.json');
                let alertData = null;
                if (!fs.existsSync(alertFile)) {
                    return interaction.editReply({ content: 'No alert channel set. Use /helldivers alert in a channel first.', ephemeral: true });
                }
                try {
                    alertData = JSON.parse(fs.readFileSync(alertFile, 'utf8'));
                } catch (e) {
                    return interaction.editReply({ content: 'Could not read alert file.', ephemeral: true });
                }
                if (!alertData.channelId) {
                    return interaction.editReply({ content: 'No alert channel set. Use /helldivers alert in a channel first.', ephemeral: true });
                }
                const res = await axios.get(`${API_BASE}/war/news`).catch(() => null);
                const news = res && Array.isArray(res.data) ? res.data : [];
                const latest = news.length ? news[news.length - 1] : null;
                if (!latest) {
                    return interaction.editReply({ content: 'No updates found from the API.', ephemeral: true });
                }
                const channel = interaction.client.channels.cache.get(alertData.channelId);
                if (!channel) {
                    return interaction.editReply({ content: 'Alert channel not found. Set it again with /helldivers alert.', ephemeral: true });
                }
                // Try to find a patch notes link in the message or add a default
                let patchLink = '';
                if (latest.links && Array.isArray(latest.links) && latest.links.length) {
                    patchLink = latest.links[0];
                } else if (latest.message && latest.message.match(/https?:\/\/[\w./?=&%-]+/)) {
                    patchLink = latest.message.match(/https?:\/\/[\w./?=&%-]+/)[0];
                } else {
                    patchLink = 'https://helldiverstrainingmanual.com/patch-notes';
                }
                const time = latest.time ? new Date(latest.time).toUTCString() : '';
                const msg = `**Helldivers Update!**\n${time}\n${latest.message || JSON.stringify(latest).slice(0, 200)}\nPatch notes: ${patchLink}`;
                await channel.send(msg);
                return interaction.editReply({ content: `Test alert sent to <#${alertData.channelId}>.`, ephemeral: true });
            }

            if (sub === 'updates') {
                // Show the latest news/update from the API, always include patch notes link if possible
                const res = await axios.get(`${API_BASE}/war/news`);
                const news = Array.isArray(res.data) ? res.data : [];
                const latest = news.length ? news[news.length - 1] : null;
                const embed = new EmbedBuilder()
                    .setTitle('Helldivers — Latest Update')
                    .setColor('#f5b041')
                    .setFooter({ text: 'Source: Helldivers Training Manual' })
                    .setTimestamp();
                if (!latest) {
                    embed.setDescription('No updates found.');
                } else {
                    const time = latest.time ? new Date(latest.time).toUTCString() : '';
                    let patchLink = '';
                    if (latest.links && Array.isArray(latest.links) && latest.links.length) {
                        patchLink = latest.links[0];
                    } else if (latest.message && latest.message.match(/https?:\/\/[\w./?=&%-]+/)) {
                        patchLink = latest.message.match(/https?:\/\/[\w./?=&%-]+/)[0];
                    } else {
                        patchLink = 'https://helldiverstrainingmanual.com/patch-notes';
                    }
                    embed.setDescription(`**${time}**\n${latest.message || JSON.stringify(latest).slice(0, 200)}\nPatch notes: ${patchLink}`);
                }
                return interaction.editReply({ embeds: [embed] });
            }

            if (sub === 'alert') {
                // Store the channel ID for alerts in a file (simple JSON)
                const fs = require('fs');
                const path = require('path');
                const alertFile = path.join(__dirname, '../helldivers_alert.json');
                const channelId = interaction.channelId;
                let data = { channelId, lastUpdate: 0 };
                try {
                    if (fs.existsSync(alertFile)) {
                        const raw = fs.readFileSync(alertFile, 'utf8');
                        data = JSON.parse(raw);
                    }
                } catch (e) {}
                data.channelId = channelId;
                // Save
                fs.writeFileSync(alertFile, JSON.stringify(data, null, 2));
                return interaction.editReply({ content: `Alert set! This channel (<#${channelId}>) will receive a message when a new Helldivers update is detected.`, ephemeral: true });
            }

            if (sub === 'map') {
                // Fetch status, campaign, major orders, and planets concurrently
                const [statusRes, campaignRes, ordersRes, planetsRes] = await Promise.all([
                    axios.get(`${API_BASE}/war/status`).catch(() => ({ data: null })),
                    axios.get(`${API_BASE}/war/campaign`).catch(() => ({ data: null })),
                    axios.get(`${API_BASE}/war/major-orders`).catch(() => ({ data: null })),
                    axios.get(`${API_BASE}/planets`).catch(() => ({ data: null })),
                ]);

                const status = statusRes && statusRes.data ? statusRes.data : null;
                const campaign = campaignRes && campaignRes.data ? campaignRes.data : null;
                const orders = ordersRes && ordersRes.data ? ordersRes.data : null;
                const planetsData = planetsRes && planetsRes.data ? planetsRes.data : {};

                const embed = new EmbedBuilder()
                    .setTitle('Helldivers — Real-time Galaxy Map')
                    .setColor('#7c3aed')
                    .setFooter({ text: 'Data: Helldivers Training Manual' })
                    .setTimestamp();

                if (!status && !campaign && !orders) {
                    embed.setDescription('Could not retrieve data from the Helldivers API.');
                    return interaction.editReply({ embeds: [embed] });
                }

                // Determine active planets from campaign data (array)
                const activePlanets = Array.isArray(campaign) ? campaign : [];

                // Map status entries by planet index or name
                const statusMap = new Map();
                if (status && Array.isArray(status)) {
                    for (const entry of status) {
                        const idx = entry.index ?? entry.planetIndex ?? entry[0] ?? null;
                        if (idx !== null && idx !== undefined) statusMap.set(String(idx), entry);
                    }
                } else if (status && typeof status === 'object') {
                    for (const k of Object.keys(status)) statusMap.set(String(k), status[k]);
                }

                const blocks = ['▁','▂','▃','▄','▅','▆','▇','█'];
                function sparkline(values) {
                    if (!Array.isArray(values) || values.length === 0) return '';
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    if (min === max) return blocks[Math.floor((values[0]/100) * (blocks.length-1))] .repeat(values.length);
                    return values.map(v => {
                        const norm = (v - min) / (max - min);
                        const idx = Math.max(0, Math.min(blocks.length - 1, Math.round(norm * (blocks.length - 1))));
                        return blocks[idx];
                    }).join('');
                }

                // Show major orders summary if present
                if (orders) {
                    try {
                        const orderNames = [];
                        if (Array.isArray(orders) && orders.length) {
                            for (const o of orders.slice(0,3)) {
                                const title = o.name || o.title || JSON.stringify(o).slice(0,40);
                                orderNames.push(title);
                            }
                        } else if (typeof orders === 'object') orderNames.push(JSON.stringify(orders).slice(0,80));
                        if (orderNames.length) embed.addFields({ name: 'Major Orders', value: orderNames.join('\n') });
                    } catch (e) {}
                }

                // For up to 6 active planets, fetch a short history to build a liberation trend
                const planetsToShow = (activePlanets.length ? activePlanets.slice(0,6) : Array.from(statusMap.keys()).slice(0,6));

                const planetFields = [];
                const historyPromises = planetsToShow.map(p => {
                    const idx = (p && (p.index ?? p.planetIndex)) ?? (Array.isArray(p) ? (p[2] ?? p[0]) : p);
                    const indexStr = String(idx ?? p);
                    return axios.get(`${API_BASE}/war/history/${indexStr}?timeframe=short`).then(r => ({ index: indexStr, history: r.data })).catch(() => ({ index: indexStr, history: null }));
                });

                const histories = await Promise.all(historyPromises);

                for (const item of histories) {
                    const idx = item.index;
                    const stat = statusMap.get(String(idx)) || {};
                    // Try to get planet info from planetsData
                    const planetInfo = planetsData && planetsData[idx] ? planetsData[idx] : {};
                    let name = planetInfo.name || planetInfo.planetName || stat.name || stat.planetName || (Array.isArray(activePlanets) ? (activePlanets.find(ap => (ap.index==idx || ap[2]==idx || ap[0]==idx)) || [])[1] : null) || `#${idx}`;
                    const players = stat.players ?? stat.playerCount ?? stat[1] ?? 'N/A';
                    const hist = Array.isArray(item.history) ? item.history : [];
                    const percents = hist.map(h => {
                        if (h && (h.liberation !== undefined)) return Number(h.liberation) || 0;
                        if (h && (h.liberationPercent !== undefined)) return Number(h.liberationPercent) || 0;
                        if (h && h.status && typeof h.status === 'number') return Number(h.status) || 0;
                        if (h && h[1] !== undefined && !isNaN(Number(h[1]))) return Number(h[1]);
                        return 0;
                    }).filter(v => v !== null && v !== undefined);
                    const current = percents.length ? percents[percents.length-1] : (stat.liberation ?? stat.liberationPercent ?? stat[2] ?? 'N/A');
                    const trend = percents.length ? sparkline(percents) : 'no history';
                    // Try to include image if available
                    let img = planetInfo.image || planetInfo.thumbnail || planetInfo.img || null;
                    let value = `Players: **${players}** • Liberation: **${current}%**\nTrend: ${trend}`;
                    if (img) value += `\n[Image](${img})`;
                    planetFields.push({ name: `${name}`, value });
                }

                if (planetFields.length) {
                    embed.addFields(...planetFields);
                } else {
                    embed.setDescription('No planet data available to build the map.');
                }

                return interaction.editReply({ embeds: [embed] });
            }

            return interaction.editReply('Unknown subcommand');
        } catch (err) {
            console.error('Helldivers command error:', err);
            return interaction.editReply({ content: 'There was an error fetching data from the Helldivers API.', ephemeral: true });
        }
    },
};
