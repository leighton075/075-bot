const express = require('express');
const querystring = require('querystring');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';

const app = express();
const port = 3000;

// Path to save user data
const userDataPath = path.join(__dirname, 'user_data.json');

// Ensure the user_data.json file is writable
fs.access(userDataPath, fs.constants.W_OK, (err) => {
    if (err) {
        console.error('File is not writable:', userDataPath);
    } else {
        console.log('User data file is writable:', userDataPath);
    }
});

app.get('/callback', async (req, res) => {
    console.log('Received callback request', req.query); // Log the request query

    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).send('Missing authorization code or state');
    }

    try {
        // Send request to Spotify to exchange the code for an access token
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: spotifyRedirectUri,
        }), {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        // Log the full response from Spotify
        console.log('Spotify token exchange response:', response.data);

        const { access_token, refresh_token } = response.data;

        // Log the successful exchange
        console.log(`Spotify authorization successful!`);
        console.log(`Discord ID: ${state}`);
        console.log(`Spotify Access Token: ${access_token}`);
        console.log(`Spotify Refresh Token: ${refresh_token}`);

        // Prepare the user data object to save
        const userData = {
            discordId: state,
            accessToken: access_token,
            refreshToken: refresh_token,
        };

        // Log the user data to confirm it's correct before saving
        console.log('User data to save:', userData);

        // Attempt to save user data to user_data.json
        console.log('Attempting to save user data:', userData);
        fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2)); // Save data to file
        console.log('Data written successfully'); // Confirm the write operation

        // Respond to the user
        res.send('Authorization successful! You can now close this window.');

    } catch (error) {
        console.error('Error during token exchange:', error.message);
        res.status(500).send('Failed to exchange authorization code for tokens');
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
