export type Entry = {
	id: number;
	name: string;
	username?: string;
	password: string;
	created_at?: string;
};

export type SecurityInfo = {
	totalEntries: number;
	encryption: string;
	keyDerivation: string;
	iterations: number;
	saltLength: number;
	ivLength: number;
	securityLevel: string;
	failedAttempts: number;
	isLocked: boolean;
	lockTimeRemaining: number;
	encryptionVersion: string;
	databaseEncrypted: boolean;
};

declare global {
	interface Window {
		vault: {
			addEntry: (entry: { name: string; username: string; password: string; masterPassword: string }) => Promise<void>;
			getEntries: (masterPassword: string) => Promise<Entry[]>;
			deleteEntry: (id: number) => Promise<boolean>;
			testMasterPassword: (password: string) => Promise<boolean>;
			getSecurityInfo: () => Promise<SecurityInfo>;
			reportActivity: () => void;
			onAutoLock: (callback: () => void) => void;
		};
	}
}
