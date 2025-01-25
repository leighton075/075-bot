const express = require('express');
const axios = require('axios');
const { exec } = require('child_process'); // Import exec

const app = express();
const PORT = 5000;

// Add your Discord webhook URLs here
const DISCORD_WEBHOOK_URLS = [
    'https://discord.com/api/webhooks/1332244290306572308/BMUuJJG8satOVbCjB1Jx9Om6AyWdtUFGK5rQp-6P1Kuts7XXnXlJJNAJJ49_F0tvpa4H',
    'https://discord.com/api/webhooks/1332269330506842183/JUbso40Ss_nrymJyLBgFbiMYM2JwoTBetzIKpNvJ2IeE9EkpriYWOHZmpzb-JyL_67mG',
    // Add more webhook URLs as needed
];

app.use(express.json());

app.post('/webhook', (req, res) => {
    const payload = req.body;

    // Check if the payload has the expected structure
    if (!payload || !payload.ref || !payload.head_commit || !payload.repository) {
        return res.status(400).send('Invalid payload');
    }

    // Check if the event is a push to the main branch
    if (payload.ref === 'refs/heads/main') { // Adjust the branch name if necessary
        const commitMessage = payload.head_commit.message || 'No commit message';
        const author = payload.head_commit.author?.name || 'Unknown Author';
        const repoName = payload.repository.name || 'Unknown Repository';

        // Get the commit hash to use for git diff
        const commitHash = payload.head_commit.id;

        // Fetch the diff stats (added/removed lines)
        getDiffStats(commitHash)
            .then(diffStats => {
                const added = diffStats.added || 0;
                const removed = diffStats.removed || 0;

                // Create the Discord message
                const message = `🎉 **Update Detected** 🎉\nRepository: **${repoName}**\nAuthor: **${author}**\nCommit Message: **${commitMessage}**\nLines Added: **${added}**\nLines Removed: **${removed}**`;

                // Send the message to all Discord webhooks
                DISCORD_WEBHOOK_URLS.forEach(webhookUrl => {
                    axios.post(webhookUrl, { content: message })
                        .then(() => {
                            console.log(`Message sent to Discord webhook: ${webhookUrl}`);
                        })
                        .catch(error => {
                            console.error(`Error sending message to Discord webhook (${webhookUrl}):`, error);
                        });
                });

                // Send a success response
                res.status(200).send('Webhook received');
            })
            .catch(error => {
                console.error('Error getting diff stats:', error);
                res.status(500).send('Error processing webhook');
            });
    } else {
        res.status(200).send('Not a push to the main branch');
    }
});

// Function to get the diff stats (added/removed lines) for a commit
function getDiffStats(commitHash) {
    return new Promise((resolve, reject) => {
        // Run git diff for the given commit hash
        exec(`git diff --stat ${commitHash}^..${commitHash}`, (err, stdout, stderr) => {
            if (err || stderr) {
                console.error('Error executing git diff:', err || stderr);
                reject('Error fetching diff stats');
            } else {
                console.log('Git diff output:', stdout); // Log the output
                const stats = stdout.split('\n').filter(line => line.includes('files changed'));
                if (stats.length > 0) {
                    const statsArr = stats[0].match(/(\d+) insertions\(\+\), (\d+) deletions\(\-\)/);
                    const added = statsArr ? parseInt(statsArr[1]) : 0;
                    const removed = statsArr ? parseInt(statsArr[2]) : 0;
                    resolve({ added, removed });
                } else {
                    console.error('No diff stats found in output:', stdout);
                    reject('No diff stats found');
                }
            }
        });
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Webhook listener running on http://localhost:${PORT}`);
});
