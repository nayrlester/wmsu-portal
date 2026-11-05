export interface Organization {
  id: string
  name: string
  slug: string
  address: string
  contactEmail: string
  contactPhone: string
  logoUrl: string | null
}

export interface Department {
  id: string
  name: string
  code: string
  headName: string
  createdAt: string
}
