import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as nodemailer from 'nodemailer'

admin.initializeApp()

const emailUser = functions.config().email?.user
const emailPass = functions.config().email?.pass

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: emailUser, pass: emailPass }
})

// Optional: verify transport at cold start (logs any auth issues immediately)
transporter.verify().then(() => {
  console.log('SMTP ready')
}).catch(err => {
  console.error('SMTP verify failed:', err)
})

export const checkUpcomingTasks = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('America/Toronto')
  .onRun(async () => {
    const now = new Date()
    const in15 = new Date(now.getTime() + 15 * 60 * 1000)
    const in30 = new Date(now.getTime() + 30 * 60 * 1000)

    try {
      // Only one email per task per run: decide the most urgent bucket first.
      const fifteenSnap = await admin.firestore()
        .collection('todos')
        .where('completed', '==', false)
        .where('notification15Sent', '==', false)
        .where('dueDate', '>=', now)
        .where('dueDate', '<=', in15)
        .get()

      const thirtySnap = await admin.firestore()
        .collection('todos')
        .where('completed', '==', false)
        .where('notification30Sent', '==', false)
        .where('dueDate', '>', in15)           // avoid overlap with 15-min set
        .where('dueDate', '<=', in30)
        .get()

      const batch = admin.firestore().batch()

      for (const doc of fifteenSnap.docs) {
        const task = { id: doc.id, ...doc.data() } as any
        await sendTaskReminder(task, 15)
        batch.update(doc.ref, { notification15Sent: true })
      }

      for (const doc of thirtySnap.docs) {
        const task = { id: doc.id, ...doc.data() } as any
        await sendTaskReminder(task, 30)
        batch.update(doc.ref, { notification30Sent: true })
      }

      await batch.commit()
      console.log(`Processed ${fifteenSnap.size} (15m) and ${thirtySnap.size} (30m) reminders`)
    } catch (err) {
      console.error('Error checking upcoming tasks:', err)
    }
  })

async function sendTaskReminder(task: any, reminderMinutes: 15 | 30) {
  try {
    const userRecord = await admin.auth().getUser(task.userId)
    const userEmail = userRecord.email
    if (!userEmail) { console.error('No email for user:', task.userId); return }

    const dueDate: Date = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate)
    const timeUntilDue = Math.max(0, Math.round((dueDate.getTime() - Date.now()) / 60000))

    const urgent = reminderMinutes === 15
    const urgencyColor = urgent ? '#ff4444' : '#ffa500'
    const urgencyText = urgent ? 'URGENT' : 'REMINDER'
    const urgencyEmoji = urgent ? '🚨' : '⏰'

    const mailOptions = {
      from: emailUser,
      to: userEmail,
      subject: `${urgencyEmoji} ${urgencyText} (${reminderMinutes}min): "${task.text}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${urgencyColor}; text-align: center;">${urgencyText} - ${reminderMinutes} Minutes</h2>
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; border: 2px solid ${urgencyColor};">
            <h3 style="color: #ffffff; margin-top: 0;">${task.text ?? 'Task'}</h3>
            <p style="color: #00ffff;"><strong>Due:</strong> ${dueDate.toLocaleString()}</p>
            <p style="color: ${urgencyColor}; font-weight: bold;"><strong>Time remaining:</strong> ${timeUntilDue} minutes</p>
            ${urgent ? '<p style="color: #ff4444; font-weight: bold; text-align: center; font-size: 16px;">⚠️ URGENT: Task due soon!</p>' : ''}
            <div style="text-align: center; margin-top: 20px;">
              <a href="https://your-app-domain.com"
                 style="background: ${urgencyColor}; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                View Task
              </a>
            </div>
          </div>
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">This is an automated ${reminderMinutes}-minute reminder from your To-Do app.</p>
        </div>`
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`Sent ${reminderMinutes}m reminder to ${userEmail}. MessageID: ${info.messageId}`)
  } catch (err) {
    console.error('Error sending reminder:', err)
  }
}

export const sendTestNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')

  const { taskId, minutes = 30 } = data
  try {
    const snap = await admin.firestore().collection('todos').doc(taskId).get()
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Task not found')

    const task = { id: snap.id, ...snap.data() } as any
    if (task.userId !== context.auth.uid) throw new functions.https.HttpsError('permission-denied', 'Not authorized')

    await sendTaskReminder(task, minutes === 15 ? 15 : 30)
    return { success: true, message: `Test ${minutes}m notification sent` }
  } catch (err) {
    console.error('Error sending test notification:', err)
    throw new functions.https.HttpsError('internal', 'Failed to send notification')
  }
})
