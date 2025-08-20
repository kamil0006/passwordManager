const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const vault = require('./db/vault');

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
	});

	win.loadURL('http://localhost:5173');
}

app.whenReady().then(createWindow);

// IPC Handlers
ipcMain.handle('vault:addEntry', (event, entry) => {
	console.log('[Main] vault:addEntry called with:', {
		name: entry.name,
		username: entry.username,
		passwordLength: entry.password?.length,
		masterPasswordLength: entry.masterPassword?.length,
	});

	try {
		const result = vault.addEntry(entry.name, entry.username, entry.password, entry.masterPassword);
		console.log('[Main] vault:addEntry completed successfully');
		return result;
	} catch (error) {
		console.error('[Main] Error in vault:addEntry:', error);
		throw error;
	}
});

ipcMain.handle('vault:getEntries', (event, masterPassword) => {
	console.log('[Main] vault:getEntries called with password length:', masterPassword?.length);

	try {
		const result = vault.getAllEntries(masterPassword);
		console.log('[Main] vault:getEntries completed, found', result.length, 'entries');
		return result;
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
	console.log('[Main] vault:testMasterPassword called with password length:', masterPassword?.length);

	try {
		const result = vault.testMasterPassword(masterPassword);
		console.log('[Main] vault:testMasterPassword completed:', result);
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
