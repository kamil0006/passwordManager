import React, { useEffect, useState } from 'react';
import './VaultScreen.css';
import type { Entry, SecurityInfo } from '../types/vault';

console.log('VaultScreen załadowany');

type Props = {
	masterPassword: string;
};

const VaultScreen: React.FC<Props> = ({ masterPassword }) => {
	const [entries, setEntries] = useState<Entry[]>([]);
	const [form, setForm] = useState({ name: '', username: '', password: '' });
	const [isLoading, setIsLoading] = useState(false);
	const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null);

	const loadEntries = async () => {
		try {
			setIsLoading(true);
			console.log('[VaultScreen] Checking if window.vault exists:', !!window.vault);
			if (!window.vault) {
				console.error('[VaultScreen] window.vault is undefined!');
				return;
			}
			console.log('[VaultScreen] Calling getEntries with masterPassword');
			const result = await window.vault.getEntries(masterPassword);
			console.log('[VaultScreen] getEntries result:', result);
			setEntries(result);
		} catch (error) {
			console.error('[VaultScreen] Error loading entries:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const loadSecurityInfo = async () => {
		try {
			const info = await window.vault.getSecurityInfo();
			setSecurityInfo(info);
		} catch (error) {
			console.error('[VaultScreen] Error loading security info:', error);
		}
	};

	useEffect(() => {
		loadEntries();
		loadSecurityInfo();
	}, [masterPassword]);

	const resetForm = () => {
		setForm({ name: '', username: '', password: '' });
	};

	const handleAdd = async () => {
		console.log('[VaultScreen] handleAdd called with form:', form);
		console.log('[VaultScreen] Form validation - name:', form.name.trim(), 'password:', form.password.trim());

		if (!form.name.trim() || !form.password.trim()) {
			console.log('[VaultScreen] Validation failed - missing required fields');
			alert('Service name and password are required!');
			return;
		}

		try {
			console.log('[VaultScreen] About to call window.vault.addEntry');
			console.log('[VaultScreen] window.vault exists:', !!window.vault);

			if (!window.vault) {
				console.error('[VaultScreen] window.vault is undefined!');
				alert('Vault API not available. Please restart the app.');
				return;
			}

			console.log('[VaultScreen] Calling addEntry with:', { ...form, masterPassword: '***' });
			await window.vault.addEntry({ ...form, masterPassword });
			console.log('[VaultScreen] addEntry completed successfully');

			resetForm();
			console.log('[VaultScreen] Form reset after add');
			await loadEntries(); // Reload entries after adding
			await loadSecurityInfo(); // Reload security info
			console.log('[VaultScreen] Entries and security info reloaded after add');
		} catch (error) {
			console.error('[VaultScreen] Error adding entry:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			alert(`Failed to add entry: ${errorMessage}`);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm('Are you sure you want to delete this entry?')) {
			return;
		}

		try {
			console.log('[VaultScreen] Deleting entry with ID:', id);
			console.log('[VaultScreen] Current form state before delete:', form);

			const success = await window.vault.deleteEntry(id);
			console.log('[VaultScreen] Delete operation result:', success);

			if (success) {
				console.log('[VaultScreen] Entry deleted successfully');
				// Clear form and reload entries
				resetForm();
				console.log('[VaultScreen] Form reset, new state:', { name: '', username: '', password: '' });
				await loadEntries();
				await loadSecurityInfo(); // Reload security info
				console.log('[VaultScreen] Entries and security info reloaded after delete');
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

	const formatDate = (dateString?: string) => {
		if (!dateString) return 'Unknown';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return 'Unknown';
		}
	};

	return (
		<div className='vault-container'>
			<div className='vault-card'>
				<h1 className='vault-title'>Password Manager</h1>

				<div className='security-info'>
					🔒 <strong>Maximum Security Active</strong>
					<br />
					PBKDF2-200k iterations • AES-256-CBC • Unique salt per entry • Random IV
					{securityInfo && (
						<div className='security-details'>
							<small>
								{securityInfo.totalEntries} entries • {securityInfo.iterations.toLocaleString()} iterations •
								{securityInfo.saltLength}-bit salt • {securityInfo.ivLength}-bit IV
							</small>
						</div>
					)}
				</div>

				{/* Add Entry Form */}
				<div className='add-entry-section'>
					<h3 className='add-entry-title'>Add Entry</h3>
					<div className='add-entry-form'>
						<input
							placeholder='Service (required)'
							value={form.name}
							onChange={e => setForm({ ...form, name: e.target.value })}
							className='add-entry-input'
						/>
						<input
							placeholder='Username (optional)'
							value={form.username}
							onChange={e => setForm({ ...form, username: e.target.value })}
							className='add-entry-input'
						/>
						<input
							placeholder='Password (required)'
							type='password'
							value={form.password}
							onChange={e => setForm({ ...form, password: e.target.value })}
							className='add-entry-input'
						/>
						<button onClick={handleAdd} className='add-entry-button' disabled={isLoading}>
							{isLoading ? 'Adding...' : 'Add'}
						</button>
					</div>
				</div>

				{/* Entries List */}
				<div>
					<h3 className='entries-section-title'>
						Passwords ({entries.length}){isLoading && <span className='loading-indicator'>Loading...</span>}
					</h3>
					{entries.length === 0 ? (
						<div className='no-entries'>{isLoading ? 'Loading passwords...' : 'No passwords saved yet.'}</div>
					) : (
						<div className='entries-list'>
							{entries.map(entry => (
								<div key={entry.id} className='entry-card'>
									<div className='entry-name'>{entry.name}</div>
									<div className='entry-username'>{entry.username || 'No username'}</div>
									<div className='entry-password'>{entry.password}</div>
									<div className='entry-date'>{formatDate(entry.created_at)}</div>
									<button onClick={() => handleDelete(entry.id)} className='delete-button' title='Delete this entry'>
										<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'>
											<path d='M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z' />
										</svg>
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
