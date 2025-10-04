# Email Notification Setup Guide

## 🚀 Quick Setup

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Install Functions Dependencies
```bash
cd functions
npm install
```

### 3. Configure Email Service
Set up your email credentials in Firebase config:

```bash
# For Gmail (recommended)
firebase functions:config:set email.user="your-email@gmail.com" email.pass="your-app-password"

# For other email services, update the service in functions/src/index.ts
```

### 4. Deploy Functions
```bash
firebase deploy --only functions
```

### 5. Enable Required APIs
In your Firebase Console:
- Go to Project Settings → Cloud Messaging
- Enable Cloud Functions API
- Enable Cloud Scheduler API

## 📧 Email Service Configuration

### Gmail Setup (Recommended)
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use this app password in Firebase config

### Other Email Services
Update the `emailConfig` in `functions/src/index.ts`:

```typescript
const emailConfig = {
  service: 'outlook', // or 'yahoo', 'hotmail', etc.
  auth: {
    user: 'your-email@outlook.com',
    pass: 'your-password'
  }
}
```

## 🔧 How It Works

1. **Scheduled Check**: Every minute, the system checks for tasks due in the next 30 minutes
2. **Email Sending**: Sends styled HTML emails with task details
3. **Prevention**: Marks notifications as sent to avoid duplicates
4. **User Control**: Users can toggle email notifications per task

## 📱 Features

- ✅ 30-minute advance notifications
- ✅ Beautiful HTML email templates
- ✅ User preference controls
- ✅ Duplicate prevention
- ✅ Secure authentication
- ✅ Real-time task monitoring

## 🛠️ Testing

Test the notification system:

```bash
# Deploy and test
firebase deploy --only functions

# Check logs
firebase functions:log
```

## 🔒 Security

- Email credentials stored securely in Firebase config
- User authentication required
- Firestore rules prevent unauthorized access
- App passwords used instead of main passwords

## 📊 Monitoring

Monitor your functions in the Firebase Console:
- Functions → Logs
- Functions → Metrics
- Firestore → Usage

## 🚨 Troubleshooting

### Common Issues:
1. **Email not sending**: Check app password and 2FA setup
2. **Functions not triggering**: Verify Cloud Scheduler is enabled
3. **Permission errors**: Check Firestore rules
4. **Missing notifications**: Ensure `emailNotifications: true` in task data

### Debug Commands:
```bash
# View function logs
firebase functions:log --only checkUpcomingTasks

# Test function locally
firebase emulators:start --only functions
```
