import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginScreen from './components/LoginScreen';
import VaultScreen from './components/VaultScreen';

function App() {
	const [masterPassword, setMasterPassword] = useState<string | null>(null);

	return (
		<ThemeProvider>
			{!masterPassword ? <LoginScreen onLogin={setMasterPassword} /> : <VaultScreen masterPassword={masterPassword} />}
		</ThemeProvider>
	);
}

export default App;
