const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Add your Discord webhook URLs here
const DISCORD_WEBHOOK_URLS = [
    'https://discord.com/api/webhooks/1332244290306572308/BMUuJJG8satOVbCjB1Jx9Om6AyWdtUFGK5rQp-6P1Kuts7XXnXlJJNAJJ49_F0tvpa4H',
    'https://discord.com/api/webhooks/1332269330506842183/JUbso40Ss_nrymJyLBgFbiMYM2JwoTBetzIKpNvJ2IeE9EkpriYWOHZmpzb-JyL_67mG',
];

// GitHub API details
const GITHUB_API_TOKEN = process.env.GITHUB_TOKEN; // Replace with your GitHub token
const GITHUB_API_URL = 'https://api.github.com';

// Store the last sent message IDs for each webhook
const lastMessageIds = new Map();

app.use(express.json());

app.post('/webhook', async (req, res) => {
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
        const commitHash = payload.head_commit.id;

        try {
            // Fetch the commit details from the GitHub API
            const commitDetails = await fetchCommitDetails(payload.repository.full_name, commitHash);

            // Get the number of lines added and removed
            const added = commitDetails.stats?.additions || 0;
            const removed = commitDetails.stats?.deletions || 0;

            // Get the list of modified files
            const modifiedFiles = commitDetails.files
                ?.filter(file => file.status === 'modified') // Filter only modified files
                .map(file => file.filename) // Extract filenames
                .join('\n') || 'No files modified'; // Join filenames with newlines

            // Create the Discord message
            const message = `🎉 **Update Detected** 🎉\nRepository: **${repoName}**\nAuthor: **${author}**\nCommit Message: **${commitMessage}**\nLines Added: **${added}**\nLines Removed: **${removed}**\nModified Files:\n\`\`\`\n${modifiedFiles}\n\`\`\``;

            // Send the message to all Discord webhooks
            for (const webhookUrl of DISCORD_WEBHOOK_URLS) {
                try {
                    // Delete the previous message if it exists
                    const lastMessageId = lastMessageIds.get(webhookUrl);
                    if (lastMessageId) {
                        console.log(`Attempting to delete message ${lastMessageId} for webhook: ${webhookUrl}`);
                        await deleteMessage(webhookUrl, lastMessageId);
                        console.log(`Deleted previous message for webhook: ${webhookUrl}`);
                    }

                    // Send the new message
                    const response = await axios.post(webhookUrl, { content: message });
                    const newMessageId = response.data.id;

                    // Update the last sent message ID
                    lastMessageIds.set(webhookUrl, newMessageId);
                    console.log(`Message sent to Discord webhook: ${webhookUrl}`);
                    console.log(`New message ID: ${newMessageId}`);
                } catch (error) {
                    console.error(`Error sending message to Discord webhook (${webhookUrl}):`, error);
                    if (error.response) {
                        console.error('Response data:', error.response.data);
                        console.error('Response headers:', error.response.headers);
                    }
                }
            }

            // Send a success response
            res.status(200).send('Webhook received');
        } catch (error) {
            console.error('Error fetching commit details:', error);
            res.status(500).send('Error processing webhook');
        }
    } else {
        res.status(200).send('Not a push to the main branch');
    }
});

// Function to fetch commit details from the GitHub API
async function fetchCommitDetails(repoFullName, commitHash) {
    const url = `${GITHUB_API_URL}/repos/${repoFullName}/commits/${commitHash}`;
    const headers = {
        Authorization: `Bearer ${GITHUB_API_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
    };

    const response = await axios.get(url, { headers });
    return response.data;
}

// Function to delete a message using the Discord API
async function deleteMessage(webhookUrl, messageId) {
    const deleteUrl = `${webhookUrl}/messages/${messageId}`;
    try {
        await axios.delete(deleteUrl);
    } catch (error) {
        console.error(`Error deleting message ${messageId}:`, error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response headers:', error.response.headers);
        }
        throw error;
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Webhook listener running on http://localhost:${PORT}`);
});