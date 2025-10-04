export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  aboutMe?: string
  profilePictureUrl?: string
  createdAt: Date
  updatedAt: Date
}
