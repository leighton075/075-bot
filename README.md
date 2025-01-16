# 075 Bot

Bot is designed for use on a small private server because I don't like Maki. It's built using Node.js and the discord.js library with help from a few third party api's.

## Features

- **Join & Leave Announcements**: Send a message welcoming or announcing when someone joins or leaves the server.
- **Message Filtering**: Set up so the photo channel can only contain google photos album links.
- **Moderation**: Give/Remove roles and Kick/Ban users.
- **User Info/Avatar**: Get info about a user or their avatar.
- **Fortnite Stats/Status**: Uses the fortnite-api and the fornite server status api to get info about server status's and player stats.
- **YouTube Info**: Gets info about channels and videos.
- **Steam Inventory Info**: Uses the steam web api to get info about a users profile (recently played games etc.) and the value of their steam inventory.
- **Username Tracking**: Uses the sherlock via apify to search for a username across the web.
- **Squaring Calc**: Because people don't know how to square numbers.
- **Soundboard**: Provides functionality to play sounds in vc.
- **User Verification**: Users must verify via a command and their id and username is stored in a mySQL database.

## Todo

- Fix inventory value api response error
- Add embeds to anything that needs to look pretty
- Remove user authentication on kick/ban
- Add verification to all commands (maybe not admin commands)
- Unban command

## Disclaimer

This is my first ever discord bot so feel free to dm me suggestions or let me know if I'm doing anything wrong.
Code is obviously free for use.
