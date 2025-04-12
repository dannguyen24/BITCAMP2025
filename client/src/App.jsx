import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ContentDisplay from './components/ContentDisplay';
import './App.css'; // Styles

// Holding state, fetching data, passing things down! 🧠
function App() {
  // State for the folders... starts empty!
  const [folderStructure, setFolderStructure] = useState({});
  // State for what's selected... starts null!
  const [selectedItem, setSelectedItem] = useState(null);
  // State for the content of the selected thing... starts null!
  const [currentContent, setCurrentContent] = useState(null);
  // Are we busy fetching structure or content? Let's track THAT!
  const [isLoading, setIsLoading] = useState(false);
  // Uh oh, errors happen! 
  const [error, setError] = useState(null);


  // This function fetches the folder structure from the backend...
  // AND! It will ALSO be used as the CALLBACK after a successful upload! Clever! ✨
  const fetchStructure = useCallback(async () => {
    console.log("Fetching/Refreshing structure... here we go!");
    setIsLoading(true); // We're busy now!
    setError(null); // Clear old errors!
    try {
      const response = await fetch('/api/structure');
      if (!response.ok) {
         throw new Error(`HTTP error! Status: ${response.status} ... backend playing hard to get?`);
      }
      const data = await response.json();
      console.log("Got structure data! Looks like:", data);
      // Make sure it's an object! Safety first!
      setFolderStructure(data || {});
    } catch (err) {
      console.error("Failed to fetch structure! Bummer!", err);
      setError(`Couldn't load lecture structure: ${err.message}. Is the backend okay?? 🤔`);
      setFolderStructure({}); // Reset on error!
    } finally {
        setIsLoading(false); // Done loading structure! 
    }
    // Empty array means this useCallback function ID doesn't change often... good for passing as prop!
  }, []);

  // useEffect hook! Runs once on mount to get the first load of folders!
  useEffect(() => {
    console.log("App mounted! Let's get the initial structure...");
    fetchStructure();
  }, [fetchStructure]); // Dependency is the function itself

  // Another useEffect! Runs when 'selectedItem' changes to fetch content! 
  useEffect(() => {
    if (!selectedItem) {
      // Nothing selected? Clear content! 
      setCurrentContent(null);
      return;
    }

    // Function to fetch the actual transcript/resources!
    const fetchContent = async () => {
      console.log("Fetching content for:", selectedItem);
      setIsLoading(true); // Busy fetching content!
      setError(null); // Clear old errors!
      setCurrentContent(null); // Clear old content! Feels snappy!
      try {
        const { subject, topic } = selectedItem;
        // --- MAKE SURE THIS URL IS RIGHT!! --- '/api/content' or similar!
        const response = await fetch(`/api/content?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`);
         if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}... content fetch failed!`);
        }
        const data = await response.json(); // The good stuff!
        console.log("Got content data!", data);
        setCurrentContent(data); // Put it in state!
      } catch (err) {
        console.error("Failed to fetch content!", err);
        setError(`Couldn't load content for ${selectedItem.topic}: ${err.message}`);
        setCurrentContent(null); // Error? No content for you!
      } finally {
        setIsLoading(false); // Done loading content!
      }
    };

    fetchContent(); // Run the fetcher!
  }, [selectedItem]); // Re-run when selectedItem changes!


  // This gets called by the Sidebar when a topic is clicked... 
  const handleSelectTopic = (subject, topic) => {
    console.log("Topic selected in App.jsx:", subject, topic);
    if (selectedItem?.subject !== subject || selectedItem?.topic !== topic) {
        setSelectedItem({ subject, topic });
    } else {
        console.log("...but it's the same one already selected. Doing nothing!")
    }
  };


  // Render the main layout! Sidebar on left, content on right
  return (
    <div className="app-container">
      {/* Render the Sidebar... pass down the structure, selection handlers... */}
      {/* AND! Pass the 'fetchStructure' function as the 'onUploadSuccess' callback! */}
      <Sidebar
        structure={folderStructure}
        onSelectTopic={handleSelectTopic}
        selectedItem={selectedItem}
        onUploadSuccess={fetchStructure} // <-- Pass the refresh function here!
        // isLoading={isLoading} // Pass general loading state if Sidebar wants to show it
      />
      {/* Render the Content Display area... still just shows content! */}
      <ContentDisplay
        content={currentContent}
        selectedItem={selectedItem}
        isLoading={isLoading} // Let it know if *anything* is loading!
        error={error} // Show errors if they happen!
      />
    </div>
  );
}

export default App; // And... scene! 🎉
