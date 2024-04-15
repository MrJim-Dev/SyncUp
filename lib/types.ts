// custom types for supabase
// ./types/userProfile.ts

export type UserProfile = {
  userid: string
  first_name: string
  last_name: string
  gender: string
  dateofbirth: string
  description: string
  company: string
  profilepicture: Buffer | Uint8Array | undefined
  website: string
  updatedat: Date
}
// ./types/combinedUserData.ts
export type CombinedUserData = {
  id: string
  email: string
  role: string
  created_at: Date
  updated_at: Date
  first_name: string
  last_name: string
  gender: string
  dateofbirth: Date
  description: string
  company: string
  website: string
  updatedat: Date
}
