const { parentPort } = require('worker_threads');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

console.log('[VaultWorker] Secure worker thread started');

// Real security constants
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Secure memory management
let sensitiveData = new Map();
let securityContext = null;

// Enhanced error handling
process.on('uncaughtException', error => {
	console.error('[VaultWorker] Uncaught exception:', error);
	// Don't crash the worker, just log and continue
	if (parentPort) {
		parentPort.postMessage({
			id: 'error',
			result: null,
			error: `Worker error: ${error.message}`,
			timestamp: Date.now(),
		});
	}
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('[VaultWorker] Unhandled rejection at:', promise, 'reason:', reason);
	// Handle unhandled promises gracefully
});

// Secure memory cleanup
function secureMemoryCleanup() {
	try {
		// Clear sensitive data from memory
		sensitiveData.clear();

		// Clear security context
		securityContext = null;

		// Force garbage collection if available
		if (global.gc) {
			global.gc();
		}

		console.log('[VaultWorker] Secure memory cleanup completed');
	} catch (error) {
		console.error('[VaultWorker] Memory cleanup error:', error);
	}
}

// Real encryption functions
function generateSecureSalt() {
	return crypto.randomBytes(SALT_LENGTH);
}

function generateSecureIV() {
	return crypto.randomBytes(IV_LENGTH);
}

function deriveSecureKey(password, salt) {
	return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

function encryptSecure(text, key, iv) {
	const cipher = crypto.createCipher('aes-256-gcm', key);
	cipher.setAAD(Buffer.from('password-manager', 'utf8'));

	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	const authTag = cipher.getAuthTag();

	return {
		encrypted,
		authTag: authTag.toString('hex'),
		iv: iv.toString('hex'),
	};
}

function decryptSecure(encryptedData, key, iv) {
	try {
		const decipher = crypto.createDecipher('aes-256-gcm', key);
		decipher.setAAD(Buffer.from('password-manager', 'utf8'));
		decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

		let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		console.error('[VaultWorker] Decryption failed:', error.message);
		return null;
	}
}

// Secure password validation
function validatePasswordStrength(password) {
	const checks = {
		length: password.length >= 12,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		numbers: /\d/.test(password),
		special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
		noCommon: !['password', '123456', 'qwerty', 'admin'].includes(password.toLowerCase()),
	};

	const score = Object.values(checks).filter(Boolean).length;
	const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';

	return {
		isValid: score >= 4,
		score,
		strength,
		checks,
		recommendations: Object.entries(checks)
			.filter(([_, passed]) => !passed)
			.map(([check]) => check),
	};
}

// Handle messages from main process
parentPort.on('message', async message => {
	try {
		console.log('[VaultWorker] Processing message:', message.type);

		let result;

		switch (message.type) {
			case 'initialize':
				// Initialize security context
				securityContext = {
					sessionId: crypto.randomBytes(16).toString('hex'),
					startTime: Date.now(),
					operations: 0,
				};
				result = { success: true, sessionId: securityContext.sessionId };
				break;

			case 'addEntry':
				// Handle old vault operations for compatibility
				try {
					const vault = require('./vault');
					result = vault.addEntry(
						message.data.name,
						message.data.username,
						message.data.password,
						message.data.category,
						message.data.masterPassword
					);
				} catch (error) {
					console.error('[VaultWorker] Error in addEntry:', error);
					throw error;
				}
				break;

			case 'getEntries':
				try {
					const vault = require('./vault');
					result = vault.getAllEntries(message.data);
				} catch (error) {
					console.error('[VaultWorker] Error in getEntries:', error);
					throw error;
				}
				break;

			case 'deleteEntry':
				try {
					const vault = require('./vault');
					result = vault.deleteEntry(message.data);
				} catch (error) {
					console.error('[VaultWorker] Error in deleteEntry:', error);
					throw error;
				}
				break;

			case 'testMasterPassword':
				try {
					const vault = require('./vault');
					result = vault.testMasterPassword(message.data);
				} catch (error) {
					console.error('[VaultWorker] Error in testMasterPassword:', error);
					throw error;
				}
				break;

			case 'validatePassword':
				result = validatePasswordStrength(message.data.password);
				break;

			case 'encryptData':
				const salt = generateSecureSalt();
				const iv = generateSecureIV();
				const key = deriveSecureKey(message.data.password, salt);
				const encrypted = encryptSecure(message.data.text, key, iv);

				result = {
					encrypted: encrypted.encrypted,
					salt: salt.toString('hex'),
					iv: encrypted.iv,
					authTag: encrypted.authTag,
				};
				break;

			case 'decryptData':
				const decKey = deriveSecureKey(message.data.password, Buffer.from(message.data.salt, 'hex'));
				const decrypted = decryptSecure(message.data.encryptedData, decKey, Buffer.from(message.data.iv, 'hex'));

				result = { decrypted };
				break;

			case 'generatePassword':
				const length = message.data.length || 16;
				const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
				let generatedPassword = '';

				for (let i = 0; i < length; i++) {
					generatedPassword += charset.charAt(crypto.randomInt(charset.length));
				}

				result = { password: generatedPassword };
				break;

			case 'securityAudit':
				result = {
					sessionId: securityContext?.sessionId,
					operations: securityContext?.operations || 0,
					uptime: securityContext ? Date.now() - securityContext.startTime : 0,
					memoryUsage: process.memoryUsage(),
					securityLevel: 'Enhanced',
					encryption: 'AES-256-GCM',
					keyDerivation: 'PBKDF2-SHA256',
					iterations: PBKDF2_ITERATIONS,
				};
				break;

			case 'cleanup':
				secureMemoryCleanup();
				result = { success: true, message: 'Secure cleanup completed' };
				break;

			default:
				throw new Error(`Unknown message type: ${message.type}`);
		}

		// Update security context
		if (securityContext) {
			securityContext.operations++;
		}

		// Send result back to main process
		parentPort.postMessage({
			id: message.id,
			result,
			error: null,
			timestamp: Date.now(),
		});
	} catch (error) {
		console.error('[VaultWorker] Error processing message:', error);

		// Send error back to main process
		parentPort.postMessage({
			id: message.id,
			result: null,
			error: error.message,
			timestamp: Date.now(),
		});
	}
});

// Handle worker shutdown
process.on('exit', () => {
	console.log('[VaultWorker] Worker thread shutting down');
	secureMemoryCleanup();
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
	console.log('[VaultWorker] Received SIGTERM, shutting down gracefully');
	secureMemoryCleanup();
	process.exit(0);
});

// Periodic security cleanup
setInterval(() => {
	if (securityContext && securityContext.operations > 1000) {
		console.log('[VaultWorker] High operation count, performing security cleanup');
		secureMemoryCleanup();
		securityContext.operations = 0;
	}
}, 30000); // Every 30 seconds
