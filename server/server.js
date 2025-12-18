require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { access } = require("fs");

const app = express();
app.use(
  cors({
    origin: [
      "http://192.168.1.126:5000",
      "https://personal-webpage-nine-chi.vercel.app/",
    ],
    credentials: false,
  })
);

const PORT = process.env.PORT || 8888;

let accessToken = null;
let refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

async function refreshSpotifyToken() {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      null,
      {
        params: {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = response.data.access_token;
    console.log("Spotify access token refreshed");
  } catch (err) {
    console.log("Error refreshing token:", err.response?.data || err.message);
  }
}

refreshSpotifyToken();

setInterval(refreshSpotifyToken, 30 * 60 * 1000);

app.get("/currently-playing", async (req, res) => {
  console.log("Received request for currently playing track");
  if (!accessToken)
    return res.status(503).send({ error: "Access token not ready" });

  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.status === 204) return res.send({ playing: false });

    res.send({
      playing: true,
      track: {
        name: response.data.item.name,
        artists: response.data.item.artists
          .map((artist) => artist.name)
          .join(", "),
        album: response.data.item.album.name,
        albumImage: response.data.item.album.images[0]?.url,
      },
    });
    console.log("Fetched currently playing track");
  } catch (err) {
    res.status(500).send({
      error: "Failed to fetch currently playing track",
      details: err.response?.data,
    });
  }
});

app.get("/callback", async (req, res) => {
  res.render("index.ejs");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
