import React, { useRef, useState, useEffect } from 'react';
import { CSVView } from './components/views/CSVView';
import { MainView } from './components/views/MainView';
import { ChangelogView } from './components/views/ChangelogView';
import { SettingsView } from './components/views/SettingsView';
import { useStarlinkData } from './hooks/useStarlinkData';

function App() {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isCSVView, setIsCSVView] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const csvDownloadRef = useRef<HTMLAnchorElement>(null);
  
  const {
    ipAddresses,
    isLoading,
    fetchSuccess,
    error,
    lastUpdated,
    autoUpdateEnabled,
    updateInterval,
    updateIntervalSettings,
    changelog,
    showChangelog,
    nextUpdateTime,
    fetchData,
    toggleAutoUpdate,
    toggleChangelog
  } = useStarlinkData();

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(ipAddresses.join('\n'))
      .then(() => {
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };
  
  const handleDownloadCSV = () => {
    // Create a plain text file with the IP addresses
    const textContent = ipAddresses.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    if (csvDownloadRef.current) {
      csvDownloadRef.current.href = url;
      csvDownloadRef.current.download = `starlink_ipv4_addresses_${new Date().toISOString().slice(0, 10)}.txt`;
      csvDownloadRef.current.click();
      URL.revokeObjectURL(url);
    }
  };

  // Render CSV view if that mode is active
  if (isCSVView) {
    return <CSVView ipAddresses={ipAddresses} onBack={() => setIsCSVView(false)} />;
  }
  
  // Render changelog view if that mode is active
  if (showChangelog) {
    return <ChangelogView changelog={changelog} onBack={toggleChangelog} />;
  }

  return (
    <>
      {/* Hidden download link for CSV */}
      <a ref={csvDownloadRef} className="hidden"></a>

      <MainView
        ipAddresses={ipAddresses}
        isLoading={isLoading}
        error={error}
        fetchSuccess={fetchSuccess}
        lastUpdated={lastUpdated}
        updateInterval={updateInterval}
        copiedToClipboard={copiedToClipboard}
        showTutorial={showTutorial}
        changelog={changelog}
        nextUpdateTime={nextUpdateTime}
        onRefresh={fetchData}
        onCopy={handleCopyToClipboard}
        onViewCSV={() => setIsCSVView(true)}
        onDownload={handleDownloadCSV}
        onToggleTutorial={() => setShowTutorial(!showTutorial)}
        onViewChangelog={toggleChangelog}
      />
    </>
  );
}

export default App;