import { useState } from 'react'

interface TodoFormProps {
  onAddTodo: (text: string, dueDate?: Date, emailNotifications?: boolean) => void
}

export default function TodoForm({ onAddTodo }: TodoFormProps) {
  const [inputValue, setInputValue] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (inputValue.trim() !== '') {
      let dueDateTime: Date | undefined
      
      if (dueDate) {
        if (dueTime) {
          // Combine date and time
          dueDateTime = new Date(`${dueDate}T${dueTime}`)
        } else {
          // Just date, set to end of day
          dueDateTime = new Date(`${dueDate}T23:59:59`)
        }
      }
      
      onAddTodo(inputValue.trim(), dueDateTime, emailNotifications)
      
      // Reset form
      setInputValue('')
      setDueDate('')
      setDueTime('')
      setEmailNotifications(true)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className="input-section">
      <input
        type="text"
        className="task-input"
        placeholder="Enter a new task..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <div className="datetime-inputs">
        <input
          type="date"
          className="date-input"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          title="Due date (optional)"
        />
        <input
          type="time"
          className="time-input"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          title="Due time (optional)"
        />
      </div>
      {dueDate && (
        <div className="notification-toggle">
          <label className="notification-label">
            <input
              type="checkbox"
              className="notification-checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
            <span className="notification-text">📧 Email reminders at 30min & 15min before due</span>
          </label>
        </div>
      )}
      <button className="add-button" onClick={handleSubmit}>
        ADD
      </button>
    </div>
  )
}
