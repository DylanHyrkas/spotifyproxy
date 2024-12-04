// local ip = 192.168.15.70
const express = require('express');
const request = require('request');
const cors = require('cors');
const dotenv = require('dotenv');
const querystring = require('querystring');

dotenv.config();

const app = express();
app.use(express.static(__dirname + '/public'))
   .use(cors());

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = 'https://spotifyproxy.onrender.com/callback';

app.get('/login', (req, res) => {
    const scope = 'user-read-private user-read-email playlist-read-private streaming user-read-playback-state user-modify-playback-state user-library-read';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri
        }));
});

app.get('/callback', (req, res) => {
    const code = req.query.code || null;
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
    };
    request.post(authOptions, (error, response, body) => {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;
        // Pass the tokens to the browser as query parameters
        res.redirect('/?' +
            querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token
            }));
    });
});

app.get('/refresh_token', (req, res) => {
    const refresh_token = req.query.refresh_token;
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };
    request.post(authOptions, (error, response, body) => {
        const access_token = body.access_token;
        res.send({
            'access_token': access_token
        });
    });
});

const PORT = 8888;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
});
