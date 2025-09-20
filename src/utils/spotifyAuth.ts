// Spotify OAuth 2.0 Authentication Service

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  country: string;
  followers: { total: number };
}

class SpotifyAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string[];
  private tokens: SpotifyTokens | null = null;

  constructor() {
    this.clientId = import.meta.env.PUBLIC_SPOTIFY_CLIENT_ID || 'f6c632a5493346fdbda98cd49c4825a3';
    this.clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET || 'b72908fea2834f3fa4cba956761af25e';
    this.redirectUri = import.meta.env.PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:4321/callback';
    
    // Required scopes for playback control and user data
    this.scopes = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-read-email',
      'user-read-private',
      'streaming'
    ];
  }

  // Generate authorization URL
  getAuthorizationUrl(): string {
    const state = this.generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: this.scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: state,
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, state: string): Promise<SpotifyTokens> {
    const storedState = localStorage.getItem('spotify_auth_state');
    
    if (state !== storedState) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const tokens = await response.json() as SpotifyTokens;
    this.setTokens(tokens);
    localStorage.removeItem('spotify_auth_state');
    
    return tokens;
  }

  // Refresh access token
  async refreshAccessToken(): Promise<SpotifyTokens> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refresh_token
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    const newTokens = await response.json() as Partial<SpotifyTokens>;
    
    // Preserve refresh token if not provided in response
    const updatedTokens: SpotifyTokens = {
      ...this.tokens,
      ...newTokens,
      refresh_token: newTokens.refresh_token || this.tokens.refresh_token
    };

    this.setTokens(updatedTokens);
    return updatedTokens;
  }

  // Get current user profile
  async getCurrentUser(): Promise<SpotifyUser> {
    const token = await this.getValidAccessToken();
    
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    return await response.json();
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available - user needs to authenticate');
    }

    // Check if token is expired (with 5 minute buffer)
    const expirationTime = this.getTokenExpirationTime();
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (now >= (expirationTime - bufferTime)) {
      await this.refreshAccessToken();
    }

    return this.tokens!.access_token;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.access_token !== '';
  }

  // Logout user
  logout(): void {
    this.tokens = null;
    localStorage.removeItem('spotify_tokens');
    localStorage.removeItem('spotify_token_timestamp');
    localStorage.removeItem('spotify_auth_state');
  }

  // Store tokens securely
  private setTokens(tokens: SpotifyTokens): void {
    this.tokens = tokens;
    localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
    localStorage.setItem('spotify_token_timestamp', Date.now().toString());
  }

  // Load tokens from storage
  loadTokensFromStorage(): boolean {
    try {
      const storedTokens = localStorage.getItem('spotify_tokens');
      const timestamp = localStorage.getItem('spotify_token_timestamp');
      
      if (storedTokens && timestamp) {
        this.tokens = JSON.parse(storedTokens);
        return true;
      }
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
    }
    
    return false;
  }

  // Get token expiration time
  private getTokenExpirationTime(): number {
    const timestamp = localStorage.getItem('spotify_token_timestamp');
    if (!timestamp || !this.tokens) {
      return 0;
    }
    
    return parseInt(timestamp) + (this.tokens.expires_in * 1000);
  }

  // Generate random string for state parameter
  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    
    return text;
  }

  // Get current tokens (for debugging)
  getCurrentTokens(): SpotifyTokens | null {
    return this.tokens;
  }
}

export const spotifyAuth = new SpotifyAuthService();