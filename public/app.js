let deviceId;
let token;
let player;
let isShuffle = false;

// Parse the URL hash to get the access token
(function() {
    const params = new URLSearchParams(window.location.search);
    token = params.get('access_token');

    if (token) {
        document.getElementById('login').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';

        fetchUserProfile(token);
        fetchUserPlaylists(token);
        // The player will be initialized when the SDK calls window.onSpotifyWebPlaybackSDKReady
    } else {
        // Redirect to /login if token is not present
        window.location.href = '/login';
    }
})();

// Define window.onSpotifyWebPlaybackSDKReady globally
window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
        name: 'Web Playback SDK',
        getOAuthToken: cb => { cb(token); },
        volume: 0.5
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => { displayError('Initialization Error:', message); });
    player.addListener('authentication_error', ({ message }) => { displayError('Authentication Error:', message); });
    player.addListener('account_error', ({ message }) => { displayError('Account Error:', message); });
    player.addListener('playback_error', ({ message }) => { displayError('Playback Error:', message); });

    // Ready
    // Ready
player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    deviceId = device_id;

    // Get the current shuffle state
    fetch('https://api.spotify.com/v1/me/player', {
        headers: {
            'Authorization': 'Bearer ' + token
        },
    })
    .then(response => response.json())
    .then(data => {
        isShuffle = data.shuffle_state;
        const shuffleButton = document.getElementById('shuffle-button');
        if (isShuffle) {
            shuffleButton.classList.add('active');
        } else {
            shuffleButton.classList.remove('active');
        }
    })
    .catch(error => {
        console.error('Error fetching player state:', error);
    });
});

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    player.connect();
};

function fetchUserProfile(token) {
    fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        // Log the scopes included in the token
        console.log('Token scopes:', response.headers.get('scope'));
        return response.json();
    })
    .then(data => {
        document.getElementById('username').innerText = `Hello, ${data.display_name} here is your library`;
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        displayError('Error fetching user profile', error.message);
    });
}

function fetchUserPlaylists(token) {
    Promise.all([
        fetch('https://api.spotify.com/v1/me/playlists', {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(response => response.json()),
        fetch('https://api.spotify.com/v1/me/tracks', {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(response => response.json())
    ])
    .then(([playlistsData, likedSongsData]) => {
        const playlistsDiv = document.getElementById('playlists');

        // Handle possible errors in playlistsData
        if (playlistsData.error) {
            throw new Error(playlistsData.error.message);
        }

        // Display regular playlists
        playlistsData.items.forEach(playlist => {
            if (!playlist || !playlist.name) {
                // Skip if playlist data is invalid
                return;
            }

            const playlistElement = document.createElement('div');
            playlistElement.innerText = playlist.name;
            playlistElement.addEventListener('click', (event) => {
                event.preventDefault();
                playPlaylist(token, playlist.uri);
            });
            playlistsDiv.appendChild(playlistElement);
        });

        // Add Liked Songs as a special playlist
        const likedSongsElement = document.createElement('div');
        likedSongsElement.innerText = 'Liked Songs';
        likedSongsElement.addEventListener('click', (event) => {
            event.preventDefault();
            playLikedSongs(token);
        });
        playlistsDiv.appendChild(likedSongsElement);
    })
    .catch(error => {
        console.error('Error fetching playlists:', error);
        displayError('Error fetching playlists', error.message);
    });
}

function playPlaylist(token, contextUri) {
    if (!deviceId) {
        displayError('Player not ready', 'The player is not ready yet. Please wait...');
        return;
    }
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ context_uri: contextUri }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
    })
    .then(response => {
        if (response.status === 204) {
            console.log('Playback started successfully');
        } else {
            return response.json().then(data => {
                throw new Error(data.error.message);
            });
        }
    })
    .catch(error => {
        console.error('Error starting playback:', error);
        displayError('Error starting playback:', error.message);
    });
}

// Function to display error messages with a 'Proceed' button
function displayError(title, message) {
    const errorContainer = document.getElementById('error-message');
    errorContainer.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <button id="proceed-button">Proceed Anyway</button>
    `;
    errorContainer.style.display = 'block';

    document.getElementById('proceed-button').addEventListener('click', () => {
        errorContainer.style.display = 'none';
    });
}

// Add this code after your existing code
// Add event listeners for playback controls after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const nextButton = document.getElementById('next-button');
    const prevButton = document.getElementById('prev-button');
    const shuffleButton = document.getElementById('shuffle-button');
    const shuffleIcon = document.getElementById('shuffle-icon');

    playButton.addEventListener('click', () => {
        player.resume().then(() => {
            console.log('Resumed playback');
        }).catch(error => {
            console.error('Error resuming playback:', error);
            displayError('Error resuming playback', error.message);
        });
    });

    pauseButton.addEventListener('click', () => {
        player.pause().then(() => {
            console.log('Paused playback');
        }).catch(error => {
            console.error('Error pausing playback:', error);
            displayError('Error pausing playback', error.message);
        });
    });

    nextButton.addEventListener('click', () => {
        player.nextTrack().then(() => {
            console.log('Skipped to next track');
        }).catch(error => {
            console.error('Error skipping to next track:', error);
            displayError('Error skipping to next track', error.message);
        });
    });

    prevButton.addEventListener('click', () => {
        player.previousTrack().then(() => {
            console.log('Went back to previous track');
        }).catch(error => {
            console.error('Error going to previous track:', error);
            displayError('Error going to previous track', error.message);
        });
    });

    shuffleButton.addEventListener('click', () => {
        isShuffle = !isShuffle; // Toggle shuffle state
        setShuffleState(token, isShuffle);
        // Update button appearance
        if (isShuffle) {
            shuffleButton.classList.add('active');
        } else {
            shuffleButton.classList.remove('active');
        }
    });
});

function playLikedSongs(token) {
    fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error.message);
        }

        const trackUris = data.items.map(item => item.track.uri);

        if (!deviceId) {
            displayError('Player not ready', 'The player is not ready yet. Please wait...');
            return;
        }

        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({ uris: trackUris }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
        })
        .then(response => {
            if (response.status === 204) {
                console.log('Playing Liked Songs');
            } else {
                return response.json().then(data => {
                    throw new Error(data.error.message);
                });
            }
        })
        .catch(error => {
            console.error('Error playing Liked Songs:', error);
            displayError('Error playing Liked Songs', error.message);
        });
    })
    .catch(error => {
        console.error('Error fetching Liked Songs:', error);
        displayError('Error fetching Liked Songs', error.message);
    });
}

function setShuffleState(token, state) {
    if (!deviceId) {
        displayError('Player not ready', 'The player is not ready yet. Please wait...');
        return;
    }
    fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}&device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + token
        },
    })
    .then(response => {
        if (response.status === 204) {
            console.log(`Shuffle mode set to ${state}`);
        } else {
            return response.json().then(data => {
                throw new Error(data.error.message);
            });
        }
    })
    .catch(error => {
        console.error('Error setting shuffle mode:', error);
        displayError('Error setting shuffle mode', error.message);
    });
}
