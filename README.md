# 🔒 Secure Password Manager

A desktop password manager built with Electron and React, featuring enterprise-grade security.

## 🚀 Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   cd frontend && npm install
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

## 🛡️ Security Features

- **AES-256-CBC encryption** with unique salt and IV per entry
- **PBKDF2 key derivation** with 500,000 iterations
- **Individual password encryption** with unique salt and IV per entry
- **Auto-lock** after 5 minutes of inactivity
- **Account lockout** after 5 failed attempts
- **Clipboard protection** with auto-clear after 30 seconds
- **Secure password display** (masked, not plain text)

## 🔑 Master Password Requirements

Your master password must be:

- At least 12 characters long
- Include uppercase letters (A-Z)
- Include lowercase letters (a-z)
- Include numbers (0-9)
- Include special characters (!@#$%^&\*)

## 📁 Project Structure

```
passwordManager/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── db/
│   └── vault.js        # Database and encryption logic
└── frontend/            # React application
    ├── src/
    │   ├── components/  # UI components
    │   └── types/       # TypeScript definitions
    └── package.json
```

## ⚠️ Important Notes

- **Never share your master password**
- **Keep your computer secure** and updated
- **Use strong passwords** for all accounts
- **Backup your database** securely

## 🚨 Security Warnings

This app protects against:

- ✅ Offline database attacks
- ✅ Brute-force attempts
- ✅ Clipboard snooping
- ✅ Memory dumps

This app does NOT protect against:

- ❌ Keyloggers on your computer
- ❌ Screen capture malware
- ❌ Physical access to unlocked computer

## 🔧 Development

Built with:

- **Electron** - Desktop application framework
- **React** - User interface
- **TypeScript** - Type safety
- **SQLite** - Local database
- **CryptoJS** - Encryption library

## 📄 License

ISC License
