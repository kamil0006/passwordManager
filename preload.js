const { contextBridge, ipcRenderer } = require('electron');

// Expose vault API
contextBridge.exposeInMainWorld('vault', {
	addEntry: entry => ipcRenderer.invoke('vault:addEntry', entry),
	getEntries: masterPassword => ipcRenderer.invoke('vault:getEntries', masterPassword),
	deleteEntry: id => ipcRenderer.invoke('vault:deleteEntry', id),
	testMasterPassword: masterPassword => ipcRenderer.invoke('vault:testMasterPassword', masterPassword),
	getSecurityInfo: () => ipcRenderer.invoke('vault:getSecurityInfo'),
	reportActivity: () => ipcRenderer.send('vault:activity'),
	reportSecurityEvent: eventType => ipcRenderer.invoke('security:reportEvent', eventType),
});

// Expose security API
contextBridge.exposeInMainWorld('security', {
	getStatus: () => ipcRenderer.invoke('security:getStatus'),
	reportEvent: eventType => ipcRenderer.invoke('security:reportEvent', eventType),
});

// Expose auto-lock listener
ipcRenderer.on('vault:autoLock', () => {
	// Dispatch custom event for the frontend to handle
	window.dispatchEvent(new CustomEvent('vault:autoLock'));
});
