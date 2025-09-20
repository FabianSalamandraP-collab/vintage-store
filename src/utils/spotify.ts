// Spotify Web API utilities
import { spotifyAuth } from './spotifyAuth';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  uri: string;
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  repeat_state: string;
  shuffle_state: boolean;
  context: {
    type: string;
    href: string;
    external_urls: { spotify: string };
    uri: string;
  } | null;
  timestamp: number;
  progress_ms: number;
  is_playing: boolean;
  item: SpotifyTrack | null;
  currently_playing_type: string;
  actions: {
    interrupting_playback?: boolean;
    pausing?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
    toggling_repeat_context?: boolean;
    toggling_shuffle?: boolean;
    toggling_repeat_track?: boolean;
    transferring_playback?: boolean;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: {
    total: number;
    items: {
      track: SpotifyTrack;
    }[];
  };
  external_urls: {
    spotify: string;
  };
}

class SpotifyAPI {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = import.meta.env.SPOTIFY_CLIENT_ID || '';
        this.clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET || '';
  }

  // Get access token using Client Credentials flow (for public data)
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    if (!this.accessToken) {
      throw new Error('Access token is null');
    }
    return this.accessToken;
    }

  // Get user access token (for user-specific operations)
  async getUserAccessToken(): Promise<string> {
    if (spotifyAuth.isAuthenticated()) {
      return await spotifyAuth.getValidAccessToken();
    }
    throw new Error('User not authenticated');
  }

  // Search for tracks
  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search tracks');
    }

    const data = await response.json();
    return data.tracks.items;
  }

  // Get playlist by ID
  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get playlist');
    }

    return await response.json();
  }

  // Obtener tracks vintage predefinidos
  async getVintageTracks(): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();
      
      // Búsqueda de música vintage/retro con artistas específicos
      const vintageQueries = [
        'artist:"The Beatles" OR artist:"Led Zeppelin" OR artist:"Pink Floyd"',
        'artist:"Queen" OR artist:"David Bowie" OR artist:"The Rolling Stones"',
        'artist:"Fleetwood Mac" OR artist:"Eagles" OR artist:"The Doors"',
        'artist:"ABBA" OR artist:"Bee Gees" OR artist:"Donna Summer"',
        'artist:"Michael Jackson" OR artist:"Prince" OR artist:"Madonna"',
        'artist:"Duran Duran" OR artist:"Depeche Mode" OR artist:"New Order"',
        'genre:classic-rock year:1970-1985',
        'genre:disco year:1975-1982',
        'genre:new-wave year:1980-1990',
        'genre:funk year:1970-1985'
      ];
      
      const allTracks: SpotifyTrack[] = [];
      
      for (const query of vintageQueries) {
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8&market=US`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const tracks = data.tracks.items
            .filter((track: any) => track.preview_url) // Solo tracks con preview
            .map(this.mapSpotifyTrack);
          allTracks.push(...tracks);
        }
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Remover duplicados y mezclar
      const uniqueTracks = this.removeDuplicateTracks(allTracks);
      return this.shuffleArray(uniqueTracks).slice(0, 25);
    } catch (error) {
      console.error('Error fetching vintage tracks:', error);
      return this.getFallbackVintageTracks();
    }
  }

  // Crear playlist vintage personalizada
  async createVintagePlaylist(userId: string, name: string = 'Sur Occidente Vintage Mix'): Promise<string | null> {
    try {
      const userToken = await spotifyAuth.getValidAccessToken();
      if (!userToken) throw new Error('User not authenticated');
      
      // Crear playlist
      const createResponse = await fetch(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            description: 'Música vintage seleccionada por Sur Occidente - Rock, Pop, Disco y New Wave de los 70s, 80s y 90s',
            public: false
          })
        }
      );
      
      if (!createResponse.ok) throw new Error('Failed to create playlist');
      
      const playlist = await createResponse.json();
      
      // Obtener tracks vintage
      const vintageTracks = await this.getVintageTracks();
      const trackUris = vintageTracks.map(track => track.uri).filter(Boolean);
      
      if (trackUris.length > 0) {
        // Agregar tracks a la playlist
        await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uris: trackUris
            })
          }
        );
      }
      
      return playlist.id;
    } catch (error) {
      console.error('Error creating vintage playlist:', error);
      return null;
    }
  }

  // Get user playlists
  async getPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      const token = await this.getUserAccessToken();
      
      const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      return data.items;
    } catch (error) {
      console.error('Error fetching playlists:', error);
      return [];
    }
  }

  // Playback Control Methods (require user authentication)
  
  // Get current playback state
  async getCurrentPlayback(): Promise<SpotifyPlaybackState | null> {
    try {
      const token = await this.getUserAccessToken();
      
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 204) {
        return null; // No active device
      }

      if (!response.ok) {
        throw new Error('Failed to get playback state');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting playback state:', error);
      return null;
    }
  }

  // Play/pause playback
  async togglePlayback(): Promise<boolean> {
    try {
      const token = await this.getUserAccessToken();
      const playbackState = await this.getCurrentPlayback();
      
      if (!playbackState) {
        throw new Error('No active device found');
      }

      const endpoint = playbackState.is_playing 
        ? 'https://api.spotify.com/v1/me/player/pause'
        : 'https://api.spotify.com/v1/me/player/play';

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error toggling playback:', error);
      return false;
    }
  }

  // Play specific track
  async playTrack(trackUri: string): Promise<boolean> {
    try {
      const token = await this.getUserAccessToken();
      
      const response = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [trackUri]
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error playing track:', error);
      return false;
    }
  }

  // Get recently played tracks
  async getRecentlyPlayed(limit: number = 20): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getUserAccessToken();
      
      const response = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recently played tracks');
      }

      const data = await response.json();
      return data.items.map((item: any) => item.track);
    } catch (error) {
      console.error('Error fetching recently played:', error);
      return [];
    }
  }

  // Play/Resume playback
  async play(deviceId?: string, uris?: string[], contextUri?: string): Promise<void> {
    const token = await this.getUserAccessToken();
    
    const body: any = {};
    if (uris) body.uris = uris;
    if (contextUri) body.context_uri = contextUri;
    
    const url = deviceId 
      ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
      : 'https://api.spotify.com/v1/me/player/play';
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to start playback');
    }
  }

  // Pause playback
  async pause(deviceId?: string): Promise<void> {
    const token = await this.getUserAccessToken();
    
    const url = deviceId 
      ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
      : 'https://api.spotify.com/v1/me/player/pause';
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to pause playback');
    }
  }

  // Skip to next track
  async skipToNext(deviceId?: string): Promise<boolean> {
    try {
      const token = await this.getUserAccessToken();
      
      const url = deviceId 
        ? `https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/next';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error skipping to next:', error);
      return false;
    }
  }

  // Skip to previous track
  async skipToPrevious(deviceId?: string): Promise<boolean> {
    try {
      const token = await this.getUserAccessToken();
      
      const url = deviceId 
        ? `https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/previous';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error skipping to previous:', error);
      return false;
    }
  }

  // Set volume
  async setVolume(volumePercent: number, deviceId?: string): Promise<boolean> {
    try {
      const token = await this.getUserAccessToken();
      
      const url = deviceId 
        ? `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}&device_id=${deviceId}`
        : `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error setting volume:', error);
      return false;
    }
  }

  // Get available devices
  async getDevices(): Promise<SpotifyDevice[]> {
    const token = await this.getUserAccessToken();
    
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get devices');
    }

    const data = await response.json();
    return data.devices;
  }

  // Transfer playback to device
  async transferPlayback(deviceId: string, play: boolean = false): Promise<void> {
    const token = await this.getUserAccessToken();
    
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: play
      })
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to transfer playback');
    }
  }

  // Check if user is authenticated
  isUserAuthenticated(): boolean {
    return spotifyAuth.isAuthenticated();
  }

  // Get authentication URL
  getAuthUrl(): string {
    return spotifyAuth.getAuthorizationUrl();
  }

  // Logout user
  logout(): void {
    spotifyAuth.logout();
  }

  // Función auxiliar para mezclar array
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Remover tracks duplicados
  private removeDuplicateTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
    const seen = new Set<string>();
    return tracks.filter(track => {
      const key = `${track.name}-${track.artists[0]?.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Mapear track de Spotify API
  private mapSpotifyTrack(track: any): SpotifyTrack {
    return {
      id: track.id,
      name: track.name,
      artists: track.artists,
      album: track.album,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      uri: track.uri,
      external_urls: track.external_urls
    };
  }

  // Tracks de respaldo en caso de error
  private getFallbackVintageTracks(): SpotifyTrack[] {
    return [
      {
        id: 'fallback-1',
        name: 'Bohemian Rhapsody',
        artists: [{ name: 'Queen' }],
        album: {
          name: 'A Night at the Opera',
          images: [{ url: '', width: 300, height: 300 }]
        },
        duration_ms: 355000,
        preview_url: null,
        uri: 'spotify:track:fallback-1',
        external_urls: { spotify: '#' }
      },
      {
        id: 'fallback-2', 
        name: 'Hotel California',
        artists: [{ name: 'Eagles' }],
        album: {
          name: 'Hotel California',
          images: [{ url: '', width: 300, height: 300 }]
        },
        duration_ms: 391000,
        preview_url: null,
        uri: 'spotify:track:fallback-2',
        external_urls: { spotify: '#' }
      },
      {
        id: 'fallback-3',
        name: 'Billie Jean',
        artists: [{ name: 'Michael Jackson' }],
        album: {
          name: 'Thriller',
          images: [{ url: '', width: 300, height: 300 }]
        },
        duration_ms: 294000,
        preview_url: null,
        uri: 'spotify:track:fallback-3',
        external_urls: { spotify: '#' }
      }
    ];
  }
}

export const spotifyAPI = new SpotifyAPI();

// Utility function to format duration
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Generate Spotify embed URL
export function getSpotifyEmbedUrl(trackId: string): string {
  return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
}

// Función para generar URL de embed
export function generateEmbedUrl(uri: string): string {
  const trackId = uri.split(':').pop();
  return `https://open.spotify.com/embed/track/${trackId}`;
}

// Función para obtener géneros vintage
export function getVintageGenres(): string[] {
  return [
    'classic rock',
    'disco',
    'new wave', 
    'funk',
    'soul',
    'motown',
    'psychedelic rock',
    'progressive rock',
    'glam rock',
    'synthpop'
  ];
}

// Función para validar si una canción es vintage
export function isVintageTrack(track: SpotifyTrack): boolean {
  // Since release_date is not in the SpotifyTrack interface, we'll need to handle it differently
  const releaseYear = 0; // Default to 0 since we can't access release date with current interface
  return releaseYear >= 1960 && releaseYear <= 1995;
}