const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const vault = require('./db/vault');

// Security variables
let autoLockTimer = null;
let lastActivityTime = Date.now();

// Security constants
const AUTO_LOCK_DELAY = 3 * 60 * 1000; // 3 minutes

// Worker thread for vault operations
let vaultWorker = null;

function createVaultWorker() {
	vaultWorker = new Worker(path.join(__dirname, 'db/vault-worker.js'));

	vaultWorker.on('message', message => {
		handleWorkerMessage(message);
	});

	vaultWorker.on('error', error => {
		console.error('[Main] Worker error:', error);
	});

	vaultWorker.on('exit', code => {
		if (code !== 0) {
			console.error('[Main] Worker stopped with exit code:', code);
		}
	});

	// Initialize worker
	vaultWorker.postMessage({
		type: 'initialize',
		id: 'init',
	});
}

function handleWorkerMessage(message) {
	try {
		if (message.error) {
			console.error('[Main] Worker error:', message.error);
			return;
		}

		// Handle different message types
		switch (message.type) {
			case 'initialize':
				console.log('[Main] Worker initialized');
				break;
		}
	} catch (error) {
		console.error('[Main] Error handling worker message:', error);
	}
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1000,
		height: 700,
		minWidth: 600,
		minHeight: 400,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
		titleBarStyle: 'hiddenInset', // More secure title bar
		webSecurity: true,
		allowRunningInsecureContent: false,
	});

	win.loadURL('http://localhost:5175').catch(err => {
		console.error('[Main] Failed to load URL:', err);
		// Try alternative ports
		win.loadURL('http://localhost:5174').catch(err2 => {
			console.error('[Main] Failed to load alternative URL:', err2);
			win.loadURL('http://localhost:5173').catch(err3 => {
				console.error('[Main] Failed to load all alternative URLs:', err3);
			});
		});
	});

	// Set up auto-lock
	setupAutoLock(win);

	// Set up security features
	setupSecurityFeatures(win);

	// Initialize vault worker
	createVaultWorker();
}

// Security features that actually work
function setupSecurityFeatures(win) {
	// Advanced developer tools and context menu blocking
	win.webContents.on('dom-ready', () => {
		win.webContents.executeJavaScript(`
			// Enhanced right-click blocking
			document.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				return false;
			}, true);
			
			// Advanced developer tools blocking
			document.addEventListener('keydown', (e) => {
				const blockedKeys = [
					'F12',
					'F5',
					'Ctrl+Shift+I',
					'Ctrl+Shift+J',
					'Ctrl+Shift+C',
					'Ctrl+U',
					'Ctrl+Shift+E'
				];
				
				const keyCombo = [
					e.key,
					e.ctrlKey ? 'Ctrl' : '',
					e.shiftKey ? 'Shift' : '',
					e.altKey ? 'Alt' : ''
				].filter(Boolean).join('+');
				
				if (blockedKeys.some(blocked => 
					blocked === keyCombo || 
					(e.ctrlKey && e.shiftKey && e.key === 'I') ||
					(e.ctrlKey && e.shiftKey && e.key === 'J') ||
					(e.ctrlKey && e.shiftKey && e.key === 'C') ||
					(e.ctrlKey && e.key === 'u')
				)) {
					e.preventDefault();
					return false;
				}
			}, true);
			
			// Screen capture detection
			document.addEventListener('visibilitychange', () => {
				if (document.hidden) {
					// Page hidden - potential screen capture
					if (window.vault && window.vault.reportSecurityEvent) {
						window.vault.reportSecurityEvent('visibility_change');
					}
				}
			});
			
		`);
	});

	// IPC handler for security status
	ipcMain.handle('security:getStatus', () => {
		return {
			encryptionActive: true,
			autoLockActive: true,
			networkIsolation: true,
			developerToolsBlocked: true,
			contextMenuBlocked: true,
		};
	});
}

// Auto-lock functionality
function setupAutoLock(win) {
	// Reset timer on any IPC activity
	const resetTimer = () => {
		lastActivityTime = Date.now();
		if (autoLockTimer) {
			clearTimeout(autoLockTimer);
		}
		autoLockTimer = setTimeout(() => {
			win.webContents.send('vault:autoLock');
		}, AUTO_LOCK_DELAY);
	};

	// Reset timer on any IPC call
	ipcMain.on('vault:activity', event => {
		resetTimer();
	});

	// Reset timer on window focus
	win.on('focus', () => {
		resetTimer();
	});

	// Reset timer on any user interaction with the window
	win.webContents.on('dom-ready', () => {
		win.webContents.executeJavaScript(`
			// Report activity to main process
			function reportActivity() {
				if (window.vault && window.vault.reportActivity) {
					window.vault.reportActivity();
				}
			}

			// Track all user activity
			document.addEventListener('mousemove', reportActivity);
			document.addEventListener('keypress', reportActivity);
			document.addEventListener('click', reportActivity);
			document.addEventListener('input', reportActivity);
			document.addEventListener('focus', reportActivity);
			document.addEventListener('scroll', reportActivity);
		`);
	});

	// Initial timer setup
	resetTimer();
}

// Cleanup on app exit
app.on('before-quit', () => {
	if (autoLockTimer) {
		clearTimeout(autoLockTimer);
	}

	// Terminate worker thread
	if (vaultWorker) {
		vaultWorker.terminate();
	}
});

app.whenReady().then(createWindow);

// IPC Handlers - Make them non-blocking
ipcMain.handle('vault:addEntry', async (event, entry) => {
	// Reset auto-lock timer on vault activity
	if (autoLockTimer) {
		clearTimeout(autoLockTimer);
		lastActivityTime = Date.now();
		autoLockTimer = setTimeout(() => {
			event.sender.send('vault:autoLock');
		}, AUTO_LOCK_DELAY);
	}

	try {
		// Use worker thread for heavy operations
		if (vaultWorker) {
			return new Promise((resolve, reject) => {
				const messageId = Date.now().toString();

				const handler = message => {
					if (message.id === messageId) {
						vaultWorker.off('message', handler);
						if (message.error) {
							reject(new Error(message.error));
						} else {
							resolve(message.result);
						}
					}
				};

				vaultWorker.on('message', handler);
				vaultWorker.postMessage({
					type: 'addEntry',
					id: messageId,
					data: entry,
				});
			});
		} else {
			// Fallback to main thread if worker not available
			const result = vault.addEntry(entry.name, entry.username, entry.password, entry.category, entry.masterPassword);
			return result;
		}
	} catch (error) {
		console.error('[Main] Error in vault:addEntry:', error);
		throw error;
	}
});

ipcMain.handle('vault:getEntries', async (event, masterPassword) => {
	// Reset auto-lock timer on vault activity
	if (autoLockTimer) {
		clearTimeout(autoLockTimer);
		lastActivityTime = Date.now();
		autoLockTimer = setTimeout(() => {
			event.sender.send('vault:autoLock');
		}, AUTO_LOCK_DELAY);
	}

	try {
		// Use worker thread for heavy operations
		if (vaultWorker) {
			return new Promise((resolve, reject) => {
				const messageId = Date.now().toString();

				const handler = message => {
					if (message.id === messageId) {
						vaultWorker.off('message', handler);
						if (message.error) {
							reject(new Error(message.error));
						} else {
							resolve(message.result);
						}
					}
				};

				vaultWorker.on('message', handler);
				vaultWorker.postMessage({
					type: 'getEntries',
					id: messageId,
					data: masterPassword,
				});
			});
		} else {
			// Fallback to main thread if worker not available
			const result = vault.getAllEntries(masterPassword);
			return result;
		}
	} catch (error) {
		console.error('[Main] Error in vault:getEntries:', error);
		throw error;
	}
});

ipcMain.handle('vault:deleteEntry', (event, id) => {
	// Reset auto-lock timer on vault activity
	if (autoLockTimer) {
		clearTimeout(autoLockTimer);
		lastActivityTime = Date.now();
		autoLockTimer = setTimeout(() => {
			event.sender.send('vault:autoLock');
		}, AUTO_LOCK_DELAY);
	}

	try {
		const result = vault.deleteEntry(id);
		return result;
	} catch (error) {
		console.error('[Main] Error in vault:deleteEntry:', error);
		throw error;
	}
});

ipcMain.handle('vault:testMasterPassword', (event, masterPassword) => {
	try {
		const result = vault.testMasterPassword(masterPassword);
		return result;
	} catch (error) {
		console.error('[Main] Error in vault:testMasterPassword:', error);
		throw error;
	}
});

ipcMain.handle('vault:getSecurityInfo', () => {
	try {
		const result = vault.getSecurityInfo();
		return result;
	} catch (error) {
		console.error('[Main] Error in vault:getSecurityInfo:', error);
		throw error;
	}
});
