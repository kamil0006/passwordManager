import React, { useEffect, useState } from 'react';
import './VaultScreen.css';
import type { Entry } from '../types/vault';
import {
	Check,
	Copy,
	Trash2,
	Briefcase,
	Home,
	Building2,
	Smartphone,
	ShoppingCart,
	Gamepad2,
	Zap,
	Key,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SecurityFeatures from './SecurityFeatures';
import { DEFAULT_CATEGORIES, suggestCategory } from '../config/categories';

type Props = {
	masterPassword: string;
	onAutoLock: () => void;
};

const VaultScreen: React.FC<Props> = ({ masterPassword, onAutoLock }) => {
	const [entries, setEntries] = useState<Entry[]>([]);
	const [form, setForm] = useState({ name: '', username: '', password: '', category: 'personal' });
	const [isLoading, setIsLoading] = useState(false);
	const [isAdding, setIsAdding] = useState(false);
	const [timeUntilLock, setTimeUntilLock] = useState(180); // 3 minutes
	const [copiedItem, setCopiedItem] = useState<string | null>(null); // Track what was copied
	const [searchQuery, setSearchQuery] = useState(''); // Search functionality
	const [selectedCategory, setSelectedCategory] = useState('all'); // Category filter

	// Helper function to render category icon
	const renderCategoryIcon = (iconName: string, size: number = 16) => {
		const iconProps = { size, className: 'category-icon' };
		switch (iconName) {
			case 'Briefcase':
				return <Briefcase {...iconProps} />;
			case 'Home':
				return <Home {...iconProps} />;
			case 'Building2':
				return <Building2 {...iconProps} />;
			case 'Smartphone':
				return <Smartphone {...iconProps} />;
			case 'ShoppingCart':
				return <ShoppingCart {...iconProps} />;
			case 'Gamepad2':
				return <Gamepad2 {...iconProps} />;
			case 'Zap':
				return <Zap {...iconProps} />;
			case 'Key':
				return <Key {...iconProps} />;
			default:
				return <Key {...iconProps} />;
		}
	};

	// Custom dropdown component for category selection
	const CategoryDropdown = ({
		value,
		onChange,
		categories,
		className,
		disabled = false,
		placeholder = 'Select category',
	}: {
		value: string;
		onChange: (value: string) => void;
		categories: typeof DEFAULT_CATEGORIES;
		className: string;
		disabled?: boolean;
		placeholder?: string;
	}) => {
		const [isOpen, setIsOpen] = useState(false);
		const selectedCategory = categories.find(cat => cat.id === value);
		const dropdownRef = React.useRef<HTMLDivElement>(null);

		// Close dropdown when clicking outside
		React.useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
					setIsOpen(false);
				}
			};

			if (isOpen) {
				// Add a small delay to prevent immediate closing
				const timeoutId = setTimeout(() => {
					document.addEventListener('click', handleClickOutside);
				}, 100);

				return () => {
					clearTimeout(timeoutId);
					document.removeEventListener('click', handleClickOutside);
				};
			}
		}, [isOpen]);

		return (
			<div
				ref={dropdownRef}
				className={`custom-dropdown ${className} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}>
				<div
					className='dropdown-trigger'
					onClick={e => {
						e.stopPropagation();
						if (!disabled) {
							setIsOpen(!isOpen);
						}
					}}>
					<div className='dropdown-content'>
						{selectedCategory ? <span>{selectedCategory.name}</span> : <span>{placeholder}</span>}
					</div>
					<div className='dropdown-arrow'>▼</div>
				</div>
				{isOpen && (
					<div className='dropdown-menu' onClick={e => e.stopPropagation()}>
						{categories.map(category => (
							<div
								key={category.id}
								className={`dropdown-option ${value === category.id ? 'selected' : ''}`}
								onClick={e => {
									e.stopPropagation();
									onChange(category.id);
									setIsOpen(false);
								}}>
								<span>{category.name}</span>
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

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
		setForm({ name: '', username: '', password: '', category: 'personal' });
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
				category: form.category,
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

	// Filter entries based on search query and category (only service name and username for security)
	const filteredEntries = entries.filter(entry => {
		// Category filter
		if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
			return false;
		}

		// Search filter
		if (!searchQuery.trim()) return true;

		const query = searchQuery.toLowerCase();
		return entry.name.toLowerCase().includes(query) || (entry.username && entry.username.toLowerCase().includes(query));
	});

	// Auto-suggest category when service name changes
	const handleServiceNameChange = (name: string) => {
		const suggestedCategory = suggestCategory(name);
		setForm(prev => ({ ...prev, name, category: suggestedCategory }));
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

				{/* Add Entry Section */}
				<div className='add-entry-section'>
					{isAdding && (
						<div className='loading-indicator'>
							<div className='spinner'></div>
							<span>Encrypting and saving entry...</span>
						</div>
					)}
					<form
						className='entry-form'
						onSubmit={e => {
							e.preventDefault();
							handleAdd();
						}}>
						<div className='form-row'>
							<input
								type='text'
								placeholder='Service (required)'
								value={form.name}
								onChange={e => handleServiceNameChange(e.target.value)}
								className='form-input'
								disabled={isAdding}
								required
							/>
							<input
								type='text'
								placeholder='Username (optional)'
								value={form.username}
								onChange={e => setForm({ ...form, username: e.target.value })}
								className='form-input'
								disabled={isAdding}
							/>
						</div>
						<div className='form-row'>
							<input
								type='password'
								placeholder='Password (required)'
								value={form.password}
								onChange={e => setForm({ ...form, password: e.target.value })}
								className='form-input'
								disabled={isAdding}
								required
							/>
							<select
								value={form.category}
								onChange={e => setForm({ ...form, category: e.target.value })}
								className='form-input'
								disabled={isAdding}>
								{DEFAULT_CATEGORIES.map(category => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
						</div>
						<button type='submit' className='submit-button' disabled={isAdding}>
							{isAdding ? 'Adding...' : 'Add Entry'}
						</button>
					</form>
				</div>

				{/* Entries List */}
				<div className='entries-section'>
					<div className='entries-header'>
						<h3 className='entries-title'>Saved Passwords</h3>

						{/* Category Filter */}
						<div className='category-filter'>
							<CategoryDropdown
								value={selectedCategory}
								onChange={value => setSelectedCategory(value)}
								categories={[
									{ id: 'all', name: 'All Categories', color: '#6b7280', icon: 'Search' },
									...DEFAULT_CATEGORIES,
								]}
								className='category-filter-select'
								placeholder='All Categories'
							/>
						</div>

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
								{filteredEntries.map(entry => {
									const category =
										DEFAULT_CATEGORIES.find(cat => cat.id === entry.category) ||
										DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
									return (
										<div key={entry.id} className='entry-card'>
											<div className='entry-header'>
												<div className='entry-name'>{entry.name}</div>
												<div
													className='category-badge'
													style={{ backgroundColor: category.color }}
													title={category.name}>
													{renderCategoryIcon(category.icon, 16)}
												</div>
											</div>
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
											<button
												onClick={() => handleDelete(entry.id)}
												className='delete-button'
												title='Delete this entry'>
												<Trash2 size={16} />
											</button>
										</div>
									);
								})}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default VaultScreen;
