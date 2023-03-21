export interface TicketsResponse {
  total: number
  results: Ticket[]
}

export interface Ticket {
  id: string
  createdAt: string
  updatedAt: string
  archived: boolean
  properties: {
    additional_redirect_urls: string
    allow_support_access: string
    affected_services: string
    content: string
    createdate: string
    email: string
    hs_lastmodifieddate: string
    hs_object_id: string
    library: string
    organization_slug: string
    project_reference: string
    project_tier: string
    severity: string
    site_url: string
    subject: string
    tags: string
    ticket_priority: string
    type: string
    verified: string
  }
}
