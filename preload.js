const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Ładowanie preload.js'); // <--- Debug

contextBridge.exposeInMainWorld('vault', {
	addEntry: entry => {
		console.log('[Preload] addEntry called with:', entry);
		return ipcRenderer.invoke('vault:addEntry', entry);
	},
	getEntries: password => {
		console.log('[Preload] getEntries called with password length:', password?.length);
		return ipcRenderer.invoke('vault:getEntries', password);
	},
	deleteEntry: id => {
		console.log('[Preload] deleteEntry called with ID:', id);
		return ipcRenderer.invoke('vault:deleteEntry', id);
	},
	testMasterPassword: password => {
		console.log('[Preload] testMasterPassword called with password length:', password?.length);
		return ipcRenderer.invoke('vault:testMasterPassword', password);
	},
	getSecurityInfo: () => {
		console.log('[Preload] getSecurityInfo called');
		return ipcRenderer.invoke('vault:getSecurityInfo');
	},
	exportToFile: password => ipcRenderer.invoke('vault:export', password),
});

console.log('[Preload] vault API exposed to renderer');
