const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const vault = require('./db/vault');

// Auto-lock variables
let autoLockTimer = null;
let lastActivityTime = Date.now();
const AUTO_LOCK_DELAY = 5 * 60 * 1000; // 5 minutes

// Worker thread for vault operations
let vaultWorker = null;

function createVaultWorker() {
	vaultWorker = new Worker(path.join(__dirname, 'db/vault-worker.js'));

	vaultWorker.on('message', message => {
		// Handle worker responses
		console.log('[Main] Worker message:', message.type);
	});

	vaultWorker.on('error', error => {
		console.error('[Main] Worker error:', error);
	});

	vaultWorker.on('exit', code => {
		if (code !== 0) {
			console.error('[Main] Worker stopped with exit code:', code);
		}
	});
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

	win.loadURL('http://localhost:5173');

	// Set up auto-lock
	setupAutoLock(win);

	// Initialize vault worker
	createVaultWorker();
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
			console.log('[Main] Auto-locking due to inactivity');
			win.webContents.send('vault:autoLock');
		}, AUTO_LOCK_DELAY);
	};

	// Reset timer on any IPC call
	ipcMain.on('vault:activity', resetTimer);

	// Reset timer on window focus
	win.on('focus', resetTimer);

	// Reset timer on mouse movement (if needed)
	win.webContents.on('dom-ready', () => {
		win.webContents.executeJavaScript(`
			document.addEventListener('mousemove', () => {
				window.vault && window.vault.reportActivity();
			});
		`);
	});
}

// Cleanup on app exit
app.on('before-quit', () => {
	if (autoLockTimer) {
		clearTimeout(autoLockTimer);
	}

	// Terminate worker thread
	if (vaultWorker) {
		console.log('[Main] Terminating vault worker...');
		vaultWorker.terminate();
	}
});

app.whenReady().then(createWindow);

// IPC Handlers - Make them non-blocking
ipcMain.handle('vault:addEntry', async (event, entry) => {
	console.log('[Main] vault:addEntry called for service:', entry.name);

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
			const result = vault.addEntry(entry.name, entry.username, entry.password, entry.masterPassword);
			console.log('[Main] vault:addEntry completed successfully');
			return result;
		}
	} catch (error) {
		console.error('[Main] Error in vault:addEntry:', error);
		throw error;
	}
});

ipcMain.handle('vault:getEntries', async (event, masterPassword) => {
	console.log('[Main] vault:getEntries called');

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
			console.log('[Main] vault:getEntries completed, found', result.length, 'entries');
			return result;
		}
	} catch (error) {
		console.error('[Main] Error in vault:getEntries:', error);
		throw error;
	}
});

ipcMain.handle('vault:deleteEntry', (event, id) => {
	console.log('[Main] vault:deleteEntry called with ID:', id);

	try {
		const result = vault.deleteEntry(id);
		console.log('[Main] vault:deleteEntry completed:', result);
		return result;
	} catch (error) {
		console.error('[Main] Error in vault:deleteEntry:', error);
		throw error;
	}
});

ipcMain.handle('vault:testMasterPassword', (event, masterPassword) => {
	console.log('[Main] vault:testMasterPassword called');

	try {
		const result = vault.testMasterPassword(masterPassword);
		console.log('[Main] vault:testMasterPassword completed successfully');
		return result;
	} catch (error) {
		console.error('[Main] Error in vault:testMasterPassword:', error);
		throw error;
	}
});

ipcMain.handle('vault:getSecurityInfo', () => {
	console.log('[Main] vault:getSecurityInfo called');

	try {
		const result = vault.getSecurityInfo();
		console.log('[Main] vault:getSecurityInfo completed:', result);
		return result;
	} catch (error) {
		console.error('[Main] Error in vault:getSecurityInfo:', error);
		throw error;
	}
});
