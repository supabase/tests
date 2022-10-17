export interface ProjectResponse {
  project: Project
  services: Service[]
}

export interface Project {
  id: number
  cloud_provider: string
  db_dns_name: string
  db_host: string
  db_name: string
  db_port: number
  db_ssl: boolean
  db_user: string
  inserted_at: string
  jwt_secret: string
  name: string
  ref: string
  region: string
  status: string
  services: Service[]
  // get projects/:ref specific fields
  connectionString: string
  kpsVersion: string
  restUrl: string
  subscription_id: string
  organization_id: number
}

export interface Service {
  id: number
  name: string
  app: App
  app_config: AppConfig
  service_api_keys: ServiceApiKey[]
}

export interface App {
  id: number
  name: string
}

export interface AppConfig {
  endpoint: string
  db_schema: string
  realtime_enabled: boolean
}

export interface ServiceApiKey {
  api_key: string
  api_key_encrypted: string
  name: string
  tags: string
}
