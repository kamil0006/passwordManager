import React, { useEffect, useState } from 'react';
import './VaultScreen.css';
import type { Entry } from '../types/vault';
import { Check, Copy, Trash2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SecurityFeatures from './SecurityFeatures';

type Props = {
	masterPassword: string;
	onAutoLock: () => void;
};

const VaultScreen: React.FC<Props> = ({ masterPassword, onAutoLock }) => {
	const [entries, setEntries] = useState<Entry[]>([]);
	const [form, setForm] = useState({ name: '', username: '', password: '' });
	const [isLoading, setIsLoading] = useState(false);
	const [isAdding, setIsAdding] = useState(false);
	const [timeUntilLock, setTimeUntilLock] = useState(180); // 3 minutes
	const [copiedItem, setCopiedItem] = useState<string | null>(null); // Track what was copied
	const [searchQuery, setSearchQuery] = useState(''); // Search functionality

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

	useEffect(() => {
		loadEntries();
		loadSecurityInfo();
	}, [masterPassword]);

	// Auto-lock functionality
	useEffect(() => {
		const handleAutoLock = () => {
			console.log('[VaultScreen] Auto-lock triggered');
			// Clear entries and trigger auto-lock callback
			setEntries([]);
			onAutoLock();
		};

		// Countdown timer for auto-lock
		const countdownInterval = setInterval(() => {
			setTimeUntilLock(prev => {
				if (prev <= 1) {
					// Auto-lock triggered
					handleAutoLock();
					return 180;
				}
				return prev - 1;
			});
		}, 1000);

		// Set up auto-lock listener using the custom event
		window.addEventListener('vault:autoLock', handleAutoLock);

		// Activity tracking
		const updateActivity = () => {
			if (window.vault && window.vault.reportActivity) {
				window.vault.reportActivity();
			}
			// Reset auto-lock timer on activity
			setTimeUntilLock(180);
		};

		// Track user activity
		document.addEventListener('mousemove', updateActivity);
		document.addEventListener('keypress', updateActivity);
		document.addEventListener('click', updateActivity);
		document.addEventListener('input', updateActivity);
		document.addEventListener('focus', updateActivity);

		return () => {
			clearInterval(countdownInterval);
			window.removeEventListener('vault:autoLock', handleAutoLock);
			document.removeEventListener('mousemove', updateActivity);
			document.removeEventListener('keypress', updateActivity);
			document.removeEventListener('click', updateActivity);
			document.removeEventListener('input', updateActivity);
			document.removeEventListener('focus', updateActivity);
		};
	}, []);

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

	// Enhanced clipboard protection with feedback
	const copyToClipboard = async (text: string, type: string, id: string) => {
		try {
			if (!navigator.clipboard) {
				console.warn('[VaultScreen] Clipboard API not available');
				return;
			}

			await navigator.clipboard.writeText(text);
			console.log(`[VaultScreen] ${type} copied to clipboard`);

			// Show "Copied!" feedback
			setCopiedItem(id);
			setTimeout(() => setCopiedItem(null), 2000); // Hide after 2 seconds

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

	// Password strength calculation
	const calculatePasswordStrength = (password: string) => {
		if (!password) return { score: 0, strength: 'none', color: '#6b7280' };

		let score = 0;
		const checks = {
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			numbers: /\d/.test(password),
			special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
		};

		// Score based on checks passed
		Object.values(checks).forEach(passed => {
			if (passed) score++;
		});

		// Bonus for length
		if (password.length >= 12) score++;
		if (password.length >= 16) score++;

		// Determine strength and color
		let strength: string;
		let color: string;

		if (score <= 2) {
			strength = 'weak';
			color = '#ef4444'; // Red
		} else if (score <= 4) {
			strength = 'medium';
			color = '#f59e0b'; // Yellow
		} else if (score <= 6) {
			strength = 'strong';
			color = '#10b981'; // Green
		} else {
			strength = 'very strong';
			color = '#059669'; // Dark green
		}

		return { score, strength, color, checks };
	};

	// Filter entries based on search query (only service name and username for security)
	const filteredEntries = entries.filter(entry => {
		if (!searchQuery.trim()) return true;

		const query = searchQuery.toLowerCase();
		return entry.name.toLowerCase().includes(query) || (entry.username && entry.username.toLowerCase().includes(query));
	});

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
			<div className='vault-header'>
				<ThemeToggle />
				<div className='auto-lock-display'>
					<span className='auto-lock-label'>Auto-lock in:</span>
					<span
						className='auto-lock-timer'
						style={{
							color: timeUntilLock <= 30 ? '#ef4444' : timeUntilLock <= 60 ? '#f59e0b' : '#10b981',
						}}>
						{Math.floor(timeUntilLock / 60)}:{(timeUntilLock % 60).toString().padStart(2, '0')}
					</span>
				</div>
				<SecurityFeatures />
			</div>

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
						{/* Password Strength Indicator */}
						{form.password && (
							<div className='password-strength-container'>
								<div className='password-strength-bars'>
									{Array.from({ length: 6 }, (_, i) => {
										const strength = calculatePasswordStrength(form.password);
										const isActive = i < strength.score;
										return (
											<div
												key={i}
												className={`strength-bar ${isActive ? 'active' : ''}`}
												style={{
													backgroundColor: isActive ? strength.color : 'var(--border-color)',
												}}
											/>
										);
									})}
								</div>
								<div
									className='password-strength-text'
									style={{ color: calculatePasswordStrength(form.password).color }}>
									{calculatePasswordStrength(form.password).strength}
								</div>
							</div>
						)}
						{/* Password Requirements Hint */}
						{!form.password && (
							<div className='password-hint'>
								<span>💡 Use 8+ chars, uppercase, lowercase, numbers, and symbols</span>
							</div>
						)}
						<button onClick={handleAdd} className='add-entry-button' disabled={isAdding}>
							{isAdding ? '...' : <Check size={18} />}
						</button>
					</div>
				</div>

				{/* Entries List */}
				<div className='entries-section'>
					<div className='entries-header'>
						<h3 className='entries-title'>Saved Passwords</h3>
						{/* Search Bar */}
						<div className='search-container'>
							<input
								type='text'
								placeholder='Search by service or username...'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className='search-input'
							/>
							{searchQuery && (
								<button onClick={() => setSearchQuery('')} className='search-clear' title='Clear search'>
									×
								</button>
							)}
						</div>
					</div>
					{isLoading ? (
						<div className='loading-indicator'>
							<div className='spinner'></div>
							<span>Decrypting passwords... This may take a few seconds.</span>
						</div>
					) : entries.length === 0 ? (
						<div className='no-entries'>No passwords saved yet. Add your first entry above!</div>
					) : (
						<>
							{/* Search Results Info */}
							{searchQuery && (
								<div className='search-results-info'>
									<span>
										Found {filteredEntries.length} of {entries.length} entries
									</span>
								</div>
							)}
							<div className='entries-list'>
								{filteredEntries.map(entry => (
									<div key={entry.id} className='entry-card'>
										<div className='entry-name'>{entry.name}</div>
										<div className='entry-username'>
											{entry.username || 'No username'}
											<button
												onClick={() => copyToClipboard(entry.username || '', 'Username', `username-${entry.id}`)}
												className='copy-button'
												title='Copy username'>
												{copiedItem === `username-${entry.id}` ? <Check size={16} /> : <Copy size={16} />}
											</button>
										</div>
										<div className='entry-password'>
											<span className='password-mask'>••••••••</span>
											<button
												onClick={() => copyToClipboard(entry.password, 'Password', `password-${entry.id}`)}
												className='copy-button'
												title='Copy password'>
												{copiedItem === `password-${entry.id}` ? <Check size={16} /> : <Copy size={16} />}
											</button>
										</div>
										<div className='entry-date'>{formatDate(entry.created_at)}</div>
										<button onClick={() => handleDelete(entry.id)} className='delete-button' title='Delete this entry'>
											<Trash2 size={16} />
										</button>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default VaultScreen;
