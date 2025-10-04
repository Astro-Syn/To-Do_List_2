
import { Todo } from '../types/Todo'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const formatDueDate = (date: Date) => {
    const now = new Date()
    const isOverdue = date < now && !todo.completed
    
    const dateStr = date.toLocaleDateString()
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    return {
      display: `${dateStr} at ${timeStr}`,
      isOverdue
    }
  }

  const dueDateInfo = todo.dueDate ? formatDueDate(todo.dueDate) : null
  const isOverdue = dueDateInfo?.isOverdue

  return (
    <div className={`task-item ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <div className="task-content">
        <span className="task-text">{todo.text}</span>
        {dueDateInfo && (
          <span className={`due-date ${isOverdue ? 'overdue-text' : ''}`}>
            Due: {dueDateInfo.display}
          </span>
        )}
      </div>
      <button 
        className="delete-button"
        onClick={() => onDelete(todo.id)}
      >
        ×
      </button>
    </div>
  )
}
