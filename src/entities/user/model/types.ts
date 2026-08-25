export interface User {
  id: string
  name: string
  email: string
  organization: string
  team: string
  role: 'predecessor' | 'successor' | 'manager'
}
