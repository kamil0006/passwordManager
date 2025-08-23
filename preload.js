const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vault', {
	addEntry: entry => {
		ipcRenderer.send('vault:activity');
		return ipcRenderer.invoke('vault:addEntry', entry);
	},
	getEntries: password => {
		ipcRenderer.send('vault:activity');
		return ipcRenderer.invoke('vault:getEntries', password);
	},
	deleteEntry: id => {
		ipcRenderer.send('vault:activity');
		return ipcRenderer.invoke('vault:deleteEntry', id);
	},
	testMasterPassword: password => {
		ipcRenderer.send('vault:activity');
		return ipcRenderer.invoke('vault:testMasterPassword', password);
	},
	getSecurityInfo: () => {
		ipcRenderer.send('vault:activity');
		return ipcRenderer.invoke('vault:getSecurityInfo');
	},
	exportToFile: password => ipcRenderer.invoke('vault:export', password),
	reportActivity: () => {
		ipcRenderer.send('vault:activity');
	},
	onAutoLock: callback => {
		ipcRenderer.on('vault:autoLock', callback);
	},
});
