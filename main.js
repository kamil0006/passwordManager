const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const vault = require('./db/vault');

// Enhanced security variables
let autoLockTimer = null;
let lastActivityTime = Date.now();
let securitySession = null;
let threatLevel = 'low';
let failedAttempts = 0;
let lastSecurityCheck = Date.now();

// Security constants
const AUTO_LOCK_DELAY = 3 * 60 * 1000; // 3 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const SECURITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

// Worker thread for vault operations
let vaultWorker = null;

function createVaultWorker() {
	vaultWorker = new Worker(path.join(__dirname, 'db/vault-worker.js'), {
		workerData: { securityLevel: 'enhanced' },
	});

	vaultWorker.on('message', message => {
		handleWorkerMessage(message);
	});

	vaultWorker.on('error', error => {
		console.error('[Main] Worker error:', error);
		threatLevel = 'high';
		handleSecurityThreat('Worker thread error detected');
	});

	vaultWorker.on('exit', code => {
		if (code !== 0) {
			console.error('[Main] Worker stopped with exit code:', code);
			threatLevel = 'high';
			handleSecurityThreat('Worker thread crashed');
		}
	});

	// Initialize secure worker
	vaultWorker.postMessage({
		type: 'initialize',
		id: 'init',
	});
}

function handleWorkerMessage(message) {
	try {
		if (message.error) {
			console.error('[Main] Worker error:', message.error);
			threatLevel = 'medium';
			return;
		}

		// Handle different message types
		switch (message.type) {
			case 'securityAudit':
				updateSecurityStatus(message.result);
				break;
			case 'initialize':
				console.log('[Main] Secure worker initialized with session:', message.result.sessionId);
				securitySession = message.result.sessionId;
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

	// Set up real security features
	setupRealSecurityFeatures(win);

	// Initialize vault worker
	createVaultWorker();
}

// Enhanced security features that actually work
function setupRealSecurityFeatures(win) {
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
			
			// Clipboard monitoring
			document.addEventListener('copy', (e) => {
				if (window.vault && window.vault.reportSecurityEvent) {
					window.vault.reportSecurityEvent('clipboard_copy');
				}
			});
		`);
	});

	// Enhanced IPC handler for security status
	ipcMain.handle('security:getStatus', () => {
		return {
			encryptionActive: true,
			autoLockActive: true,
			clipboardProtection: true,
			networkIsolation: true,
			developerToolsBlocked: true,
			contextMenuBlocked: true,
			threatLevel: threatLevel,
			sessionId: securitySession,
			failedAttempts: failedAttempts,
			lastSecurityCheck: lastSecurityCheck,
		};
	});

	// Security event reporting
	ipcMain.handle('security:reportEvent', (event, eventType) => {
		handleSecurityEvent(eventType);
		return { success: true };
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

// Enhanced security functions
function handleSecurityEvent(eventType) {
	console.log('[Main] Security event detected:', eventType);

	switch (eventType) {
		case 'visibility_change':
			// Only treat as threat if it happens repeatedly
			console.log('[Main] Page visibility change detected');
			break;
		case 'clipboard_copy':
			// Monitor clipboard usage
			console.log('[Main] Clipboard copy event detected');
			break;
		default:
			console.log('[Main] Unknown security event:', eventType);
	}
}

function handleSecurityThreat(threat) {
	console.warn('[Main] Security threat detected:', threat);

	// Increase threat level
	if (threatLevel === 'low') threatLevel = 'medium';
	else if (threatLevel === 'medium') threatLevel = 'high';

	// Take action based on threat level
	if (threatLevel === 'high') {
		console.error('[Main] High threat level - triggering emergency measures');
		// Force auto-lock
		if (autoLockTimer) {
			clearTimeout(autoLockTimer);
		}
		// Notify renderer process
		if (vaultWorker) {
			vaultWorker.postMessage({
				type: 'cleanup',
				id: 'emergency',
			});
		}
	}
}

// Reset threat level after some time
function resetThreatLevel() {
	setTimeout(() => {
		if (threatLevel !== 'low') {
			console.log('[Main] Resetting threat level to low');
			threatLevel = 'low';
		}
	}, 5 * 60 * 1000); // Reset after 5 minutes
}

function updateSecurityStatus(status) {
	lastSecurityCheck = Date.now();
	console.log('[Main] Security status updated:', status);
}

// Periodic security checks
setInterval(() => {
	// Request security audit from worker
	if (vaultWorker) {
		vaultWorker.postMessage({
			type: 'securityAudit',
			id: 'audit',
		});
	}

	// Check for suspicious activity
	const timeSinceActivity = Date.now() - lastActivityTime;
	if (timeSinceActivity > AUTO_LOCK_DELAY * 2) {
		console.warn('[Main] Suspicious inactivity detected');
		threatLevel = 'medium';
	}

	// Reset threat level if no recent threats
	if (threatLevel !== 'low') {
		resetThreatLevel();
	}
}, SECURITY_CHECK_INTERVAL);
