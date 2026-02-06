const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const API_BASE = 'https://helldiverstrainingmanual.com/api/v1';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('helldivers')
        .setDescription('Helldivers 2 info from the Helldivers Training Manual API')
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('Show current live war stats (active campaign planets)')
                .addIntegerOption(opt => opt.setName('limit').setDescription('How many planets to list').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('drops')
                .setDescription('Show recent in-game news / drops (latest messages)')
                .addIntegerOption(opt => opt.setName('limit').setDescription('How many news items to show (max 10)').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('map')
                .setDescription('Show a real-time galaxy map with active planets, liberation trends, and player counts')),

    async execute(interaction) {
        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();

        try {
            if (sub === 'stats') {
                const limit = interaction.options.getInteger('limit') || 10;
                const res = await axios.get(`${API_BASE}/war/campaign`);
                const planets = Array.isArray(res.data) ? res.data : [];

                const embed = new EmbedBuilder()
                    .setTitle('Helldivers — Active Campaign Planets')
                    .setColor('#e03b3b')
                    .setFooter({ text: 'Data from Helldivers Training Manual' });

                if (planets.length === 0) {
                    embed.setDescription('No active campaign planets found.');
                    return interaction.editReply({ embeds: [embed] });
                }

                const lines = planets.slice(0, limit).map(p => {
                    // Extract readable name from planet array
                    if (p && (p.name || p.planetName)) return `**${p.name || p.planetName}** — ${p.index ?? ''}`;
                    if (Array.isArray(p) && p[1]) return `**${p[1]}** — ${p[2] ?? ''}`;
                    return JSON.stringify(p).slice(0, 80);
                });

                embed.setDescription(lines.join('\n'));
                embed.setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            if (sub === 'drops') {
                const limit = Math.min(interaction.options.getInteger('limit') || 5, 10);
                const res = await axios.get(`${API_BASE}/war/news`);
                const news = Array.isArray(res.data) ? res.data : [];

                const embed = new EmbedBuilder()
                    .setTitle('Helldivers — Recent News')
                    .setColor('#4aa96c')
                    .setFooter({ text: 'Source: Helldivers Training Manual' });

                if (news.length === 0) {
                    embed.setDescription('No news items returned by the API.');
                    return interaction.editReply({ embeds: [embed] });
                }

                const items = news.slice(-limit).map(n => {
                    const time = n && n.time ? new Date(n.time).toUTCString() : '';
                    const message = n && n.message ? n.message : JSON.stringify(n).slice(0, 100);
                    return `**${time}** — ${message}`;
                });

                embed.setDescription(items.join('\n\n'));
                embed.setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            if (sub === 'map') {
                // Fetch status, campaign, and major orders concurrently
                const [statusRes, campaignRes, ordersRes] = await Promise.all([
                    axios.get(`${API_BASE}/war/status`).catch(() => ({ data: null })),
                    axios.get(`${API_BASE}/war/campaign`).catch(() => ({ data: null })),
                    axios.get(`${API_BASE}/war/major-orders`).catch(() => ({ data: null })),
                ]);

                const status = statusRes && statusRes.data ? statusRes.data : null;
                const campaign = campaignRes && campaignRes.data ? campaignRes.data : null;
                const orders = ordersRes && ordersRes.data ? ordersRes.data : null;

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
                        // status entries vary; try to pull index or id
                        const idx = entry.index ?? entry.planetIndex ?? entry[0] ?? null;
                        if (idx !== null && idx !== undefined) statusMap.set(String(idx), entry);
                    }
                } else if (status && typeof status === 'object') {
                    // Some endpoints return object keyed by index
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
                    } catch (e) {
                        // ignore
                    }
                }

                // For up to 6 active planets, fetch a short history to build a liberation trend
                const planetsToShow = (activePlanets.length ? activePlanets.slice(0,6) : Array.from(statusMap.keys()).slice(0,6));

                const planetFields = [];
                const historyPromises = planetsToShow.map(p => {
                    // p might be array or object; try to get index
                    const idx = (p && (p.index ?? p.planetIndex)) ?? (Array.isArray(p) ? (p[2] ?? p[0]) : p);
                    const indexStr = String(idx ?? p);
                    // fetch short history for trend (short timeframe)
                    return axios.get(`${API_BASE}/war/history/${indexStr}?timeframe=short`).then(r => ({ index: indexStr, history: r.data })).catch(() => ({ index: indexStr, history: null }));
                });

                const histories = await Promise.all(historyPromises);

                for (const item of histories) {
                    const idx = item.index;
                    const stat = statusMap.get(String(idx)) || {};
                    // derive readable name
                    let name = stat.name || stat.planetName || (Array.isArray(activePlanets) ? (activePlanets.find(ap => (ap.index==idx || ap[2]==idx || ap[0]==idx)) || [])[1] : null) || `#${idx}`;
                    const players = stat.players ?? stat.playerCount ?? stat[1] ?? 'N/A';
                    // history: array of records with liberation status; try to extract % values
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

                    planetFields.push({ name: `${name}`, value: `Players: **${players}** • Liberation: **${current}%**\nTrend: ${trend}` });
                }

                if (planetFields.length) {
                    // Discord limits 25 fields; we add what we have
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
