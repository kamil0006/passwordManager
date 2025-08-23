import React, { useEffect, useState } from 'react';
import './VaultScreen.css';
import type { Entry } from '../types/vault';
import { Check, Copy, Key, Trash2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SecurityFeatures from './SecurityFeatures';

type Props = {
	masterPassword: string;
};

const VaultScreen: React.FC<Props> = ({ masterPassword }) => {
	const [entries, setEntries] = useState<Entry[]>([]);
	const [form, setForm] = useState({ name: '', username: '', password: '' });
	const [isLoading, setIsLoading] = useState(false);
	const [isAdding, setIsAdding] = useState(false);
	const [isLocked, setIsLocked] = useState(false);

	const loadEntries = async () => {
		try {
			setIsLoading(true);
			if (!window.vault) {
				console.error('[VaultScreen] window.vault is undefined!');
				return;
			}
			const result = await window.vault.getEntries(masterPassword);
			setEntries(result);
		} catch (error) {
			console.error('[VaultScreen] Error loading entries:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const loadSecurityInfo = async () => {
		try {
			if (!window.vault) {
				console.error('[VaultScreen] window.vault is undefined!');
				return;
			}
			await window.vault.getSecurityInfo();
		} catch (error) {
			console.error('[VaultScreen] Error loading security info:', error);
		}
	};

	// Auto-lock functionality
	useEffect(() => {
		const handleAutoLock = () => {
			setIsLocked(true);
			setEntries([]);
		};

		// Set up auto-lock listener
		if (window.vault && window.vault.onAutoLock) {
			window.vault.onAutoLock(handleAutoLock);
		}

		// Activity tracking
		const updateActivity = () => {
			if (window.vault && window.vault.reportActivity) {
				window.vault.reportActivity();
			}
		};

		// Track user activity
		document.addEventListener('mousemove', updateActivity);
		document.addEventListener('keypress', updateActivity);
		document.addEventListener('click', updateActivity);

		return () => {
			document.removeEventListener('mousemove', updateActivity);
			document.removeEventListener('keypress', updateActivity);
			document.removeEventListener('click', updateActivity);
		};
	}, []);

	useEffect(() => {
		if (!isLocked) {
			loadEntries();
			loadSecurityInfo();
		}
	}, [masterPassword, isLocked]);

	const resetForm = () => {
		setForm({ name: '', username: '', password: '' });
	};

	const handleAdd = async () => {
		if (!form.name.trim() || !form.password.trim()) {
			alert('Service name and password are required!');
			return;
		}

		try {
			if (!window.vault) {
				console.error('[VaultScreen] window.vault is undefined!');
				alert('Vault API not available. Please restart the app.');
				return;
			}

			setIsAdding(true);
			await window.vault.addEntry({
				name: form.name,
				username: form.username,
				password: form.password,
				masterPassword,
			});
			resetForm();
			await loadEntries(); // Reload entries after adding
			await loadSecurityInfo(); // Reload security info
		} catch (error) {
			console.error('[VaultScreen] Error adding entry:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			alert(`Failed to add entry: ${errorMessage}`);
		} finally {
			setIsAdding(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm('Are you sure you want to delete this entry?')) {
			return;
		}

		try {
			if (!window.vault) {
				console.error('[VaultScreen] window.vault is undefined!');
				alert('Vault API not available. Please restart the app.');
				return;
			}

			const success = await window.vault.deleteEntry(id);

			if (success) {
				// Clear form and reload entries
				resetForm();
				await loadEntries();
				await loadSecurityInfo(); // Reload security info
			} else {
				console.error('[VaultScreen] Delete operation returned false');
				alert('Failed to delete entry. Please try again.');
			}
		} catch (error) {
			console.error('[VaultScreen] Error deleting entry:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			alert(`Failed to delete entry: ${errorMessage}`);
		}
	};

	// Clipboard protection
	const copyToClipboard = async (text: string, type: string) => {
		try {
			if (!navigator.clipboard) {
				console.warn('[VaultScreen] Clipboard API not available');
				return;
			}

			await navigator.clipboard.writeText(text);
			console.log(`[VaultScreen] ${type} copied to clipboard`);

			// Clear clipboard after 30 seconds for security
			setTimeout(async () => {
				try {
					await navigator.clipboard.writeText('');
					console.log('[VaultScreen] Clipboard cleared for security');
				} catch (e) {
					console.warn('[VaultScreen] Could not clear clipboard:', e);
				}
			}, 30000);
		} catch (error) {
			console.error('[VaultScreen] Failed to copy to clipboard:', error);
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return 'Unknown';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return 'Unknown';
		}
	};

	// If locked, show lock screen
	if (isLocked) {
		return (
			<div className='vault-container'>
				<ThemeToggle />
				<SecurityFeatures />
				<div className='vault-card'>
					<h1 className='vault-title'>Vault Locked</h1>
					<div className='security-info'>
						Your vault has been automatically locked due to inactivity.
						<br />
						Please restart the application and enter your master password again.
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='vault-container'>
			<ThemeToggle />
			<SecurityFeatures />
			<div className='vault-card'>
				<h1 className='vault-title'>Password Manager</h1>

				{/* Add Entry Form */}
				<div className='add-entry-section'>
					<h3 className='add-entry-title'>Add Entry</h3>
					{isAdding && (
						<div className='loading-indicator'>
							<div className='spinner'></div>
							<span>Encrypting and saving entry... This may take a few seconds.</span>
						</div>
					)}
					<div className='add-entry-form'>
						<input
							placeholder='Service (required)'
							value={form.name}
							onChange={e => setForm({ ...form, name: e.target.value })}
							className='add-entry-input'
							disabled={isAdding}
						/>
						<input
							placeholder='Username (optional)'
							value={form.username}
							onChange={e => setForm({ ...form, username: e.target.value })}
							className='add-entry-input'
							disabled={isAdding}
						/>
						<input
							placeholder='Password (required)'
							type='password'
							value={form.password}
							onChange={e => setForm({ ...form, password: e.target.value })}
							className='add-entry-input'
							disabled={isAdding}
						/>
						<button onClick={handleAdd} className='add-entry-button' disabled={isAdding}>
							{isAdding ? '...' : <Check size={18} />}
						</button>
					</div>
				</div>

				{/* Entries List */}
				<div className='entries-section'>
					<h3 className='entries-title'>Saved Passwords</h3>
					{isLoading ? (
						<div className='loading-indicator'>
							<div className='spinner'></div>
							<span>Decrypting passwords... This may take a few seconds.</span>
						</div>
					) : entries.length === 0 ? (
						<div className='no-entries'>No passwords saved yet. Add your first entry above!</div>
					) : (
						<div className='entries-list'>
							{entries.map(entry => (
								<div key={entry.id} className='entry-card'>
									<div className='entry-name'>{entry.name}</div>
									<div className='entry-username'>
										{entry.username || 'No username'}
										<button
											onClick={() => copyToClipboard(entry.username || '', 'Username')}
											className='copy-button'
											title='Copy username'>
											<Copy size={16} />
										</button>
									</div>
									<div className='entry-password'>
										<span className='password-mask'>••••••••</span>
										<button
											onClick={() => copyToClipboard(entry.password, 'Password')}
											className='copy-button'
											title='Copy password'>
											<Key size={16} />
										</button>
									</div>
									<div className='entry-date'>{formatDate(entry.created_at)}</div>
									<button onClick={() => handleDelete(entry.id)} className='delete-button' title='Delete this entry'>
										<Trash2 size={16} />
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default VaultScreen;
