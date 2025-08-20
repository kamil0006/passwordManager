const Database = require('better-sqlite3');
const CryptoJS = require('crypto-js');
const path = require('path');

console.log('[Vault] Initializing secure database...');

const db = new Database(path.join(__dirname, 'vault.db'));

// Security constants - Maximum security settings
const PBKDF2_ITERATIONS = 200000; // Increased from 100k to 200k for maximum security
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const IV_LENGTH = 16; // 128 bits for AES IV

// Drop and recreate table with maximum security
console.log('[Vault] Creating secure database structure...');
db.exec(`DROP TABLE IF EXISTS entries`);

// Create table with all security features
db.exec(`
  CREATE TABLE entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT,
    encrypted_password TEXT NOT NULL,
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('[Vault] Secure database initialized successfully');

function generateSalt() {
	return CryptoJS.lib.WordArray.random(SALT_LENGTH).toString();
}

function generateIV() {
	return CryptoJS.lib.WordArray.random(IV_LENGTH).toString();
}

function deriveKey(password, salt) {
	return CryptoJS.PBKDF2(password, salt, {
		keySize: KEY_LENGTH / 4, // CryptoJS uses 32-bit words
		iterations: PBKDF2_ITERATIONS,
	});
}

function encrypt(text, password, salt, iv) {
	const key = deriveKey(password, salt);
	return CryptoJS.AES.encrypt(text, key, { iv: CryptoJS.enc.Hex.parse(iv) }).toString();
}

function decrypt(ciphertext, password, salt, iv) {
	try {
		const key = deriveKey(password, salt);
		const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv: CryptoJS.enc.Hex.parse(iv) });
		return bytes.toString(CryptoJS.enc.Utf8);
	} catch (error) {
		console.error('[Vault] Decryption failed:', error.message);
		return null;
	}
}

function addEntry(name, username, plainPassword, masterPassword) {
	console.log('[Vault] addEntry called with:', {
		name,
		username,
		passwordLength: plainPassword?.length,
		masterPasswordLength: masterPassword?.length,
	});

	if (!name || !plainPassword || !masterPassword) {
		throw new Error('Missing required parameters');
	}

	try {
		const salt = generateSalt();
		const iv = generateIV();
		console.log('[Vault] Generated salt and IV for new entry');

		const encryptedPassword = encrypt(plainPassword, masterPassword, salt, iv);
		console.log('[Vault] Password encrypted with maximum security');

		console.log('[Vault] Adding entry with PBKDF2-200k:', name, username);

		const stmt = db.prepare(`
      INSERT INTO entries (name, username, encrypted_password, salt, iv) 
      VALUES (?, ?, ?, ?, ?)
    `);
		const result = stmt.run(name, username || '', encryptedPassword, salt, iv);
		console.log('[Vault] Entry added successfully, ID:', result.lastInsertRowid);

		return result.lastInsertRowid;
	} catch (error) {
		console.error('[Vault] Error in addEntry:', error);
		throw error;
	}
}

function getAllEntries(masterPassword) {
	try {
		console.log('[Vault] getAllEntries called');
		const stmt = db.prepare(`SELECT * FROM entries ORDER BY last_modified DESC`);
		const rows = stmt.all();
		console.log('[Vault] Retrieved', rows.length, 'entries from database');

		const entries = [];
		for (const row of rows) {
			try {
				const password = decrypt(row.encrypted_password, masterPassword, row.salt, row.iv);
				if (password) {
					entries.push({
						id: row.id,
						name: row.name,
						username: row.username,
						password: password,
						created_at: row.created_at,
						last_modified: row.last_modified,
					});
				}
			} catch (error) {
				console.error('[Vault] Failed to decrypt entry', row.id, error);
			}
		}

		console.log('[Vault] Successfully decrypted', entries.length, 'entries');
		return entries;
	} catch (error) {
		console.error('[Vault] Error in getAllEntries:', error);
		return [];
	}
}

function deleteEntry(id) {
	console.log('[Vault] Deleting entry with ID:', id);
	try {
		const stmt = db.prepare(`DELETE FROM entries WHERE id = ?`);
		const result = stmt.run(id);
		const success = result.changes > 0;
		console.log('[Vault] Delete result:', success, 'changes:', result.changes);
		return success;
	} catch (error) {
		console.error('[Vault] Error in deleteEntry:', error);
		return false;
	}
}

function testMasterPassword(masterPassword) {
	try {
		console.log('[Vault] testMasterPassword called');
		const stmt = db.prepare(`SELECT COUNT(*) as count FROM entries`);
		const result = stmt.get();

		if (result.count === 0) {
			console.log('[Vault] No entries exist, allowing any password for first use');
			return true;
		}

		// Try to decrypt at least one entry to verify the master password
		const testStmt = db.prepare(`SELECT encrypted_password, salt, iv FROM entries LIMIT 1`);
		const testRow = testStmt.get();

		if (!testRow) {
			console.log('[Vault] No test row found');
			return false;
		}

		const password = decrypt(testRow.encrypted_password, masterPassword, testRow.salt, testRow.iv);
		const isValid = password !== null;
		console.log('[Vault] Password test result:', isValid);
		return isValid;
	} catch (error) {
		console.error('[Vault] Error in testMasterPassword:', error);
		return false;
	}
}

// Security audit function
function getSecurityInfo() {
	try {
		const stmt = db.prepare(`SELECT COUNT(*) as count FROM entries`);
		const result = stmt.get();

		return {
			totalEntries: result.count,
			encryption: 'AES-256-CBC',
			keyDerivation: 'PBKDF2',
			iterations: PBKDF2_ITERATIONS,
			saltLength: SALT_LENGTH * 8, // in bits
			ivLength: IV_LENGTH * 8, // in bits
			securityLevel: 'Maximum',
		};
	} catch (error) {
		console.error('[Vault] Error getting security info:', error);
		return null;
	}
}

module.exports = {
	addEntry,
	getAllEntries,
	deleteEntry,
	testMasterPassword,
	getSecurityInfo,
};
