# 🔐 Password Manager

A secure, offline-first password manager built with Electron and React, featuring strong encryption and real security features.

## 🚀 Features

- **🔒 Strong Encryption**: AES-256-CBC encryption with PBKDF2 key derivation
- **🔄 Auto-Lock**: Automatically locks after 5 minutes of inactivity
- **📋 Clipboard Protection**: Prevents sensitive data from being copied to clipboard
- **🌐 Network Isolation**: Offline operation prevents remote attacks
- **🛡️ Developer Tools Blocking**: F12 and developer tools are disabled
- **🚫 Context Menu Blocking**: Right-click context menu is disabled
- **📱 Responsive Design**: Works on all screen sizes
- **🌙 Dark/Light Theme**: Automatic theme switching
- **⚡ Fast Performance**: Worker thread architecture for smooth operation

## 🛡️ Security Features

### **Real Protection That Actually Works:**

1. **🔐 AES-256-CBC Encryption**

   - Military-grade encryption protecting your passwords
   - PBKDF2 key derivation with 100,000 iterations
   - Each password entry is individually encrypted

2. **⏰ Auto-Lock System**

   - Automatically locks after 5 minutes of inactivity
   - Resets timer on any user interaction
   - Prevents unauthorized access when you're away

3. **📋 Clipboard Protection**

   - Monitors clipboard for suspicious changes
   - Prevents large data dumps to clipboard
   - Protects against clipboard-based attacks

4. **🌐 Network Isolation**

   - Runs completely offline
   - No internet connection required
   - Prevents remote attacks and data exfiltration

5. **🛡️ Developer Tools Blocking**

   - F12 key is disabled
   - Ctrl+Shift+I is blocked
   - View source (Ctrl+U) is blocked

6. **🚫 Context Menu Blocking**
   - Right-click context menu is disabled
   - Prevents access to browser developer tools
   - Blocks common inspection shortcuts

### **Why These Features Work:**

- **Encryption**: Your data is mathematically impossible to read without the master password
- **Auto-lock**: Prevents access when you're not actively using the app
- **Clipboard protection**: Monitors and prevents data theft through clipboard
- **Network isolation**: No network = no remote attacks possible
- **Developer tools blocking**: Prevents inspection of the app's internal workings

## 🚨 Security Warnings

**Important**: This password manager focuses on **real security** rather than impossible promises:

- **✅ Your data is encrypted** - Even if someone takes a screenshot, they cannot read your passwords
- **✅ Auto-lock protects** - Prevents unauthorized access when you're away
- **✅ Clipboard is monitored** - Prevents data theft through clipboard attacks
- **✅ Offline operation** - No network attacks possible
- **✅ Developer tools blocked** - Prevents inspection of app internals

## 📱 Responsive Design

The app automatically adapts to different screen sizes:

- **Desktop**: Full-featured interface with side panels
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Touch-friendly interface with larger buttons
- **Small Windows**: Responsive design that works at any window size

## 🚀 Getting Started

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   npm run electron
   ```

## 🏗️ Architecture

- **Frontend**: React with TypeScript
- **Backend**: Electron main process
- **Database**: Local encrypted storage
- **Security**: AES-256-CBC encryption with PBKDF2
- **Performance**: Worker thread architecture

## 🔧 Development

- **Frontend**: `frontend/src/`
- **Backend**: `main.js`, `preload.js`
- **Database**: `db/`
- **Styling**: CSS with CSS variables for theming

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please focus on:

- Improving encryption and security
- Enhancing user experience
- Fixing bugs and performance issues
- Adding real security features (not fake ones)

## ⚠️ Disclaimer

This password manager provides strong security through encryption and access controls. However, no software can completely prevent all forms of attack. The security features focus on what's actually achievable and effective rather than impossible promises.
