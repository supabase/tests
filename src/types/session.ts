export interface Token {
  currentSession: Session
  expiresAt: number
}

export interface Session {
  access_token: string
  expires_at: number
  expires_in: number
  provider_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface User {
  id: string
  aud: string
  confirmed_at: string
  created_at: string
  email: string
  email_confirmed_at: string
  last_sing_in_at: string
  phone: string
  role: string
  updated_at: string
  identities: unknown
  user_metadata: unknown
  app_metadata: unknown
}
