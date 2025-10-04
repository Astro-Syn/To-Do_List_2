
import { Todo } from '../types/Todo'
import TodoItem from './TodoItem'

interface TodoListProps {
  todos: Todo[]
  loading: boolean
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
}

export default function TodoList({ todos, loading, onToggleTodo, onDeleteTodo }: TodoListProps) {
  if (loading) {
    return (
      <div className="tasks-list">
        <div className="loading-message">
          Loading your tasks...
        </div>
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="tasks-list">
        <div className="empty-message">
          No tasks yet. Add one above to get started!
        </div>
      </div>
    )
  }

  return (
    <div className="tasks-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
        />
      ))}
    </div>
  )
}
