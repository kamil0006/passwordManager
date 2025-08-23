import React, { useState } from 'react';
import './LoginScreen.css';
import ThemeToggle from './ThemeToggle';
import SecurityFeatures from './SecurityFeatures';

type Props = {
	onLogin: (masterPassword: string) => void;
};

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
	const [password, setPassword] = useState('');
	const [isValidating, setIsValidating] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Enhanced password validation
		if (password.length < 12) {
			setError('Master password must be at least 12 characters long');
			return;
		}

		if (!/[A-Z]/.test(password)) {
			setError('Master password must contain at least one uppercase letter');
			return;
		}

		if (!/[a-z]/.test(password)) {
			setError('Master password must contain at least one lowercase letter');
			return;
		}

		if (!/\d/.test(password)) {
			setError('Master password must contain at least one number');
			return;
		}

		if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
			setError('Master password must contain at least one special character');
			return;
		}

		setIsValidating(true);
		setError('');

		try {
			// Test the master password
			const isValid = await window.vault.testMasterPassword(password);

			if (isValid) {
				onLogin(password);
			} else {
				setError('Incorrect master password. Please try again.');
			}
		} catch (error) {
			console.error('[LoginScreen] Error validating password:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			setError(errorMessage);
		} finally {
			setIsValidating(false);
		}
	};

	return (
		<div className='login-container'>
			<ThemeToggle />
			<SecurityFeatures />
			<div className='login-card'>
				<h1 className='login-title'>Password Manager</h1>

				<form onSubmit={handleSubmit} className='login-form'>
					<div className='form-group'>
						<input
							type='password'
							placeholder='Master password'
							value={password}
							onChange={e => {
								setPassword(e.target.value);
								if (error) setError(''); // Clear error when user types
							}}
							className='login-input'
							disabled={isValidating}
						/>
					</div>

					{error && <div className='error-message'>{error}</div>}

					<button type='submit' className='login-button' disabled={isValidating}>
						{isValidating ? 'Validating...' : 'Unlock'}
					</button>
				</form>
			</div>
		</div>
	);
};

export default LoginScreen;
