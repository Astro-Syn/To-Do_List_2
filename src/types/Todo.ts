export interface Todo {
  id: string
  text: string
  completed: boolean
  dueDate?: Date
  userId: string
  createdAt: Date
  notification30Sent?: boolean
  notification15Sent?: boolean
  emailNotifications?: boolean
}
