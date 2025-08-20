import { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import VaultScreen from './components/VaultScreen';

function App() {
	const [masterPassword, setMasterPassword] = useState<string | null>(null);

	if (!masterPassword) {
		return <LoginScreen onLogin={setMasterPassword} />;
	}

	return <VaultScreen masterPassword={masterPassword} />;
  
}

export default App;
