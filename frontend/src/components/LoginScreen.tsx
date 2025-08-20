import React, { useState } from 'react';
import './LoginScreen.css';

type Props = {
	onLogin: (masterPassword: string) => void;
};

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
	const [password, setPassword] = useState('');
	const [isValidating, setIsValidating] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (password.length < 4) {
			setError('Password must be at least 4 characters long');
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
			setError('An error occurred while validating the password. Please try again.');
		} finally {
			setIsValidating(false);
		}
	};

	return (
		<div className='login-container'>
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
