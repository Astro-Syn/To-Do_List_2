import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as nodemailer from 'nodemailer'

admin.initializeApp()

// Email configuration - you'll need to set these in Firebase config
const emailConfig = {
  service: 'gmail', // or your preferred email service
  auth: {
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.pass || 'your-app-password'
  }
}

const transporter = nodemailer.createTransport(emailConfig)

// Scheduled function that runs every minute to check for upcoming tasks
export const checkUpcomingTasks = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = new Date()
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
    
    try {
      // Check for 30-minute reminders
      const thirtyMinTasksSnapshot = await admin.firestore()
        .collection('todos')
        .where('dueDate', '>=', now)
        .where('dueDate', '<=', thirtyMinutesFromNow)
        .where('completed', '==', false)
        .where('notification30Sent', '==', false)
        .get()

      const thirtyMinTasks = thirtyMinTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Check for 15-minute reminders
      const fifteenMinTasksSnapshot = await admin.firestore()
        .collection('todos')
        .where('dueDate', '>=', now)
        .where('dueDate', '<=', fifteenMinutesFromNow)
        .where('completed', '==', false)
        .where('notification15Sent', '==', false)
        .get()

      const fifteenMinTasks = fifteenMinTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Send 30-minute notifications
      for (const task of thirtyMinTasks) {
        await sendTaskReminder(task, 30)
        
        // Mark 30-minute notification as sent
        await admin.firestore()
          .collection('todos')
          .doc(task.id)
          .update({ notification30Sent: true })
      }

      // Send 15-minute notifications
      for (const task of fifteenMinTasks) {
        await sendTaskReminder(task, 15)
        
        // Mark 15-minute notification as sent
        await admin.firestore()
          .collection('todos')
          .doc(task.id)
          .update({ notification15Sent: true })
      }

      console.log(`Processed ${thirtyMinTasks.length} thirty-minute reminders and ${fifteenMinTasks.length} fifteen-minute reminders`)
    } catch (error) {
      console.error('Error checking upcoming tasks:', error)
    }
  })

// Function to send email reminder
async function sendTaskReminder(task: any, reminderMinutes: number) {
  try {
    // Get user email from auth
    const userRecord = await admin.auth().getUser(task.userId)
    const userEmail = userRecord.email

    if (!userEmail) {
      console.error('No email found for user:', task.userId)
      return
    }

    const dueDate = task.dueDate.toDate()
    const timeUntilDue = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60))

    // Customize email based on reminder time
    const urgencyColor = reminderMinutes === 15 ? '#ff4444' : '#ffa500'
    const urgencyText = reminderMinutes === 15 ? 'URGENT' : 'REMINDER'
    const urgencyEmoji = reminderMinutes === 15 ? '🚨' : '⏰'

    const mailOptions = {
      from: emailConfig.auth.user,
      to: userEmail,
      subject: `${urgencyEmoji} ${urgencyText} (${reminderMinutes}min): "${task.text}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${urgencyColor}; text-align: center;">${urgencyText} - ${reminderMinutes} Minutes</h2>
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; border: 2px solid ${urgencyColor};">
            <h3 style="color: #ffffff; margin-top: 0;">${task.text}</h3>
            <p style="color: #00ffff;">
              <strong>Due:</strong> ${dueDate.toLocaleString()}
            </p>
            <p style="color: ${urgencyColor}; font-weight: bold;">
              <strong>Time remaining:</strong> ${timeUntilDue} minutes
            </p>
            ${reminderMinutes === 15 ? '<p style="color: #ff4444; font-weight: bold; text-align: center; font-size: 16px;">⚠️ URGENT: Task due soon!</p>' : ''}
            <div style="text-align: center; margin-top: 20px;">
              <a href="https://your-app-domain.com" 
                 style="background: ${urgencyColor}; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                View Task
              </a>
            </div>
          </div>
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">
            This is an automated ${reminderMinutes}-minute reminder from your To-Do List app.
          </p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`${reminderMinutes}-minute reminder sent for task: ${task.text}`)
  } catch (error) {
    console.error('Error sending reminder:', error)
  }
}

// Function to manually trigger notifications (for testing)
export const sendTestNotification = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { taskId } = data
  
  try {
    const taskDoc = await admin.firestore().collection('todos').doc(taskId).get()
    
    if (!taskDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found')
    }

    const task = { id: taskDoc.id, ...taskDoc.data() } as any
    
    // Verify user owns this task
    if (task.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized')
    }

    await sendTaskReminder(task)
    
    return { success: true, message: 'Test notification sent' }
  } catch (error) {
    console.error('Error sending test notification:', error)
    throw new functions.https.HttpsError('internal', 'Failed to send notification')
  }
})
