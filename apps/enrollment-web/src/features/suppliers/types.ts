export interface Supplier {
  id: string
  name: string
  code: string
  contactPerson: string
  email: string
  phone: string
  address: string
  tin: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface SupplierFormData {
  name: string
  code: string
  contactPerson: string
  email: string
  phone: string
  address: string
  tin: string
}
