import React, { useState, useEffect, useRef } from 'react';
import './SecurityFeatures.css';
import { Shield, CheckCircle, AlertTriangle, X, AlertCircle, Lock, Eye } from 'lucide-react';

interface SecurityStatus {
	encryptionActive: boolean;
	autoLockActive: boolean;
	clipboardProtection: boolean;
	networkIsolation: boolean;
	developerToolsBlocked: boolean;
	contextMenuBlocked: boolean;
	threatLevel?: 'low' | 'medium' | 'high';
	sessionId?: string;
	failedAttempts?: number;
	lastSecurityCheck?: number;
}

const SecurityFeatures: React.FC = () => {
	const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [timeUntilLock, setTimeUntilLock] = useState(180); // 3 minutes (180 seconds)
	const [threatIndicator, setThreatIndicator] = useState<'low' | 'medium' | 'high'>('low');
	const panelRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	// Reset timer when panel is opened
	useEffect(() => {
		if (isExpanded) {
			setTimeUntilLock(180);
		}
	}, [isExpanded]);

	// Countdown timer
	useEffect(() => {
		if (!isExpanded) return;

		const interval = setInterval(() => {
			setTimeUntilLock(prev => {
				if (prev <= 1) {
					// Auto-lock triggered
					setIsExpanded(false);
					return 180;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [isExpanded]);

	// Get security status from main process
	useEffect(() => {
		const getStatus = async () => {
			try {
				if (window.security && window.security.getStatus) {
					const status = await window.security.getStatus();
					setSecurityStatus(status);
					if (status.threatLevel) {
						setThreatIndicator(status.threatLevel);
					}
				}
			} catch (error) {
				console.error('[SecurityFeatures] Error getting security status:', error);
			}
		};

		getStatus();

		// Update status every 30 seconds
		const interval = setInterval(getStatus, 30000);
		return () => clearInterval(interval);
	}, []);

	// Click outside to close
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				panelRef.current &&
				!panelRef.current.contains(event.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setIsExpanded(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleClose = () => {
		setIsExpanded(false);
	};

	const getStatusIcon = (status: boolean) => {
		return status ? (
			<CheckCircle size={16} className='status-icon status-active' />
		) : (
			<AlertTriangle size={16} className='status-icon status-inactive' />
		);
	};

	const getStatusText = (status: boolean) => {
		return status ? 'Active' : 'Inactive';
	};

	const getStatusClass = (status: boolean) => {
		return status ? 'status-active' : 'status-inactive';
	};

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		if (minutes > 0) {
			return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
		}
		return `${remainingSeconds}s`;
	};

	const getTimeUntilLockColor = (seconds: number) => {
		if (seconds <= 30) return '#ef4444'; // Red (last 30 seconds)
		if (seconds <= 60) return '#f59e0b'; // Yellow (last minute)
		return '#10b981'; // Green (more than 1 minute)
	};

	const getThreatLevelIcon = (level: string) => {
		switch (level) {
			case 'high':
				return <AlertCircle size={20} className='threat-icon threat-high' />;
			case 'medium':
				return <AlertTriangle size={20} className='threat-icon threat-medium' />;
			default:
				return <Shield size={20} className='threat-icon threat-low' />;
		}
	};

	const getThreatLevelColor = (level: string) => {
		switch (level) {
			case 'high':
				return '#ef4444';
			case 'medium':
				return '#f59e0b';
			default:
				return '#10b981';
		}
	};

	const getThreatLevelText = (level: string) => {
		switch (level) {
			case 'high':
				return 'High Threat';
			case 'medium':
				return 'Medium Threat';
			default:
				return 'Secure';
		}
	};

	return (
		<div className='security-features'>
			<button
				ref={buttonRef}
				onClick={() => setIsExpanded(!isExpanded)}
				className='security-toggle'
				title='Security Features'>
				<Shield size={28} />
				{isExpanded && (
					<div className='auto-lock-indicator' style={{ color: getTimeUntilLockColor(timeUntilLock) }}>
						{formatTime(timeUntilLock)}
					</div>
				)}
				{/* Threat level indicator */}
				<div
					className='threat-indicator'
					style={{ backgroundColor: getThreatLevelColor(threatIndicator) }}
					title={getThreatLevelText(threatIndicator)}
				/>
			</button>

			{isExpanded && (
				<div ref={panelRef} className='security-panel'>
					<div className='security-header'>
						<h3>Security Status</h3>
						<button onClick={handleClose} className='close-button' title='Close'>
							<X size={16} />
						</button>
					</div>

					{securityStatus ? (
						<>
							{/* Threat Level Display */}
							<div className='threat-level-section'>
								<div className='threat-level-header'>
									{getThreatLevelIcon(threatIndicator)}
									<span className='threat-level-text'>{getThreatLevelText(threatIndicator)}</span>
								</div>
								{threatIndicator !== 'low' && (
									<div className='threat-warning'>⚠️ Security threats detected. Review system immediately.</div>
								)}
							</div>

							<div className='security-grid'>
								<div className='security-info-item'>
									<div className='info-header'>
										<span>Encryption</span>
										{getStatusIcon(securityStatus.encryptionActive)}
									</div>
									<div className={`status ${getStatusClass(securityStatus.encryptionActive)}`}>
										{getStatusText(securityStatus.encryptionActive)}
									</div>
								</div>

								<div className='security-info-item'>
									<div className='info-header'>
										<span>Auto-Lock</span>
										{getStatusIcon(securityStatus.autoLockActive)}
									</div>
									<div className={`status ${getStatusClass(securityStatus.autoLockActive)}`}>
										{getStatusText(securityStatus.autoLockActive)}
									</div>
								</div>

								<div className='security-info-item'>
									<div className='info-header'>
										<span>Clipboard Protection</span>
										{getStatusIcon(securityStatus.clipboardProtection)}
									</div>
									<div className={`status ${getStatusClass(securityStatus.clipboardProtection)}`}>
										{getStatusText(securityStatus.clipboardProtection)}
									</div>
								</div>

								<div className='security-info-item'>
									<div className='info-header'>
										<span>Network Isolation</span>
										{getStatusIcon(securityStatus.networkIsolation)}
									</div>
									<div className={`status ${getStatusClass(securityStatus.networkIsolation)}`}>
										{getStatusText(securityStatus.networkIsolation)}
									</div>
								</div>

								<div className='security-info-item'>
									<div className='info-header'>
										<span>Dev Tools Blocked</span>
										{getStatusIcon(securityStatus.developerToolsBlocked)}
									</div>
									<div className={`status ${getStatusClass(securityStatus.developerToolsBlocked)}`}>
										{getStatusText(securityStatus.developerToolsBlocked)}
									</div>
								</div>

								<div className='security-info-item'>
									<div className='info-header'>
										<span>Context Menu Blocked</span>
										{getStatusIcon(securityStatus.contextMenuBlocked)}
									</div>
									<div className={`status ${getStatusClass(securityStatus.contextMenuBlocked)}`}>
										{getStatusText(securityStatus.contextMenuBlocked)}
									</div>
								</div>
							</div>

							{/* Enhanced Security Info */}
							{securityStatus.sessionId && (
								<div className='security-details'>
									<div className='detail-item'>
										<Lock size={14} />
										<span>Session ID: {securityStatus.sessionId.substring(0, 8)}...</span>
									</div>
									{securityStatus.failedAttempts !== undefined && (
										<div className='detail-item'>
											<AlertTriangle size={14} />
											<span>Failed Attempts: {securityStatus.failedAttempts}</span>
										</div>
									)}
									{securityStatus.lastSecurityCheck && (
										<div className='detail-item'>
											<Eye size={14} />
											<span>Last Check: {new Date(securityStatus.lastSecurityCheck).toLocaleTimeString()}</span>
										</div>
									)}
								</div>
							)}

							<div className='security-footer'>
								<p className='security-note'>
									<strong>Auto-Lock Timer:</strong> {formatTime(timeUntilLock)} until vault locks
								</p>
								<p className='security-note'>
									<strong>Security Level:</strong> Enhanced with real-time threat detection
								</p>
							</div>
						</>
					) : (
						<div className='security-loading'>
							<div className='loading-icon'></div>
							<span>Loading security status...</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SecurityFeatures;

declare global {
	interface Window {
		security?: {
			getStatus: () => Promise<SecurityStatus>;
			reportEvent: (eventType: string) => Promise<{ success: boolean }>;
		};
	}
}
