const { parentPort } = require('worker_threads');
const vault = require('./vault');

console.log('[VaultWorker] Worker thread started');

// Handle messages from main process
parentPort.on('message', async message => {
	try {
		console.log('[VaultWorker] Received message:', message.type);

		let result;

		switch (message.type) {
			case 'addEntry':
				result = vault.addEntry(
					message.data.name,
					message.data.username,
					message.data.password,
					message.data.masterPassword
				);
				break;

			case 'getEntries':
				result = vault.getAllEntries(message.data);
				break;

			case 'deleteEntry':
				result = vault.deleteEntry(message.data);
				break;

			case 'testMasterPassword':
				result = vault.testMasterPassword(message.data);
				break;

			case 'getSecurityInfo':
				result = vault.getSecurityInfo();
				break;

			default:
				throw new Error(`Unknown message type: ${message.type}`);
		}

		// Send result back to main process
		parentPort.postMessage({
			id: message.id,
			result: result,
			error: null,
		});
	} catch (error) {
		console.error('[VaultWorker] Error processing message:', error);

		// Send error back to main process
		parentPort.postMessage({
			id: message.id,
			result: null,
			error: error.message,
		});
	}
});

// Handle worker shutdown
process.on('exit', () => {
	console.log('[VaultWorker] Worker thread shutting down');
});

process.on('uncaughtException', error => {
	console.error('[VaultWorker] Uncaught exception:', error);
	parentPort.postMessage({
		id: 'error',
		result: null,
		error: error.message,
	});
});
