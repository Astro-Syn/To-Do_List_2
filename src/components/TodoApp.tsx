import { useState, useEffect } from 'react'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../AuthContext'
import { Todo } from '../types/Todo'
import TodoForm from './TodoForm'
import TodoList from './TodoList'

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const { currentUser, logout } = useAuth()

  // Load tasks from Firestore when user logs in
  useEffect(() => {
    if (!currentUser) {
      setTodos([])
      setLoading(false)
      return
    }

    console.log('Setting up Firestore listener for user:', currentUser.uid)

    const q = query(
      collection(db, 'todos'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q, 
      (querySnapshot) => {
        console.log('Firestore query snapshot received:', querySnapshot.size, 'documents')
        const tasks: Todo[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          tasks.push({
            id: doc.id,
            text: data.text,
            completed: data.completed,
            dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
            userId: data.userId,
            createdAt: data.createdAt.toDate()
          })
        })
        console.log('Processed todos:', tasks)
        setTodos(tasks)
        setLoading(false)
      },
      (error) => {
        console.error('Firestore error:', error)
        setLoading(false)
      }
    )

    return () => {
      console.log('Cleaning up Firestore listener')
      unsubscribe()
    }
  }, [currentUser])

  const addTodo = async (text: string, dueDate?: Date, emailNotifications: boolean = true) => {
    if (text.trim() !== '' && currentUser) {
      try {
        console.log('Adding todo for user:', currentUser.uid, 'Text:', text.trim())
        const docRef = await addDoc(collection(db, 'todos'), {
          text: text.trim(),
          completed: false,
          dueDate: dueDate,
          userId: currentUser.uid,
          createdAt: new Date(),
          notification30Sent: false,
          notification15Sent: false,
          emailNotifications: emailNotifications
        })
        console.log('Todo added successfully with ID:', docRef.id)
      } catch (error) {
        console.error('Error adding todo:', error)
        alert('Failed to add task. Please check console for details.')
      }
    }
  }

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (todo) {
      try {
        await updateDoc(doc(db, 'todos', id), {
          completed: !todo.completed
        })
      } catch (error) {
        console.error('Error updating todo:', error)
      }
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id))
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length

  return (
    <div className="todo-app">
      <h1>TO DO LIST</h1>
      <p className="subtitle">Welcome, {currentUser?.email}</p>
      
      <TodoForm onAddTodo={addTodo} />
      
      <TodoList 
        todos={todos}
        loading={loading}
        onToggleTodo={toggleTodo}
        onDeleteTodo={deleteTodo}
      />

      {todos.length > 0 && (
        <div className="stats">
          <span>Total: {totalCount}</span>
          <span>Completed: {completedCount}</span>
          <span>Remaining: {totalCount - completedCount}</span>
        </div>
      )}
    </div>
  )
}
