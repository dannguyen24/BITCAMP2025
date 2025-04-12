// Imports - React, hooks, flushSync, components, styles. The usual setup!
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import Sidebar from './components/Sidebar';
import ContentDisplay from './components/ContentDisplay';
import UploadModal from './components/UploadModal';
import './App.css';

// --- NO MOCK DATA HERE ANYMORE! --- We're going live (or at least, connecting)! ---


// === App Component === Ready to talk to the backend! ===
function App() {
  // --- State Definitions ---
  const [theme, setTheme] = useState('dark'); // Defaulting to dark!
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(isResizing);
  useEffect(() => { isResizingRef.current = isResizing; }, [isResizing]);
  const appContainerRef = useRef(null);
  const sidebarRef = useRef(null);

  // --- Core Application State --- Initialize as empty/null, waiting for backend data! ---
  // *** MODIFIED STATE INIT ***: Start with empty structure!
  const [folderStructure, setFolderStructure] = useState({});
  // Selection state still uses 3 levels { subject, class, topic }
  const [selectedItem, setSelectedItem] = useState(null);
  // *** Content state expects an ARRAY of note objects from backend ***
  const [currentContent, setCurrentContent] = useState(null); // Starts null
  // Loading/Error states are important for API calls!
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // --- End Core State ---


  // --- Theme Management Logic ---
  useEffect(() => { /* ... initial theme check ... */ }, []);
  useEffect(() => { document.body.classList.toggle('dark-mode', theme === 'dark'); try {localStorage.setItem('lectureAppTheme', theme);} catch(e){} }, [theme]);
  const toggleTheme = useCallback(() => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); }, []);

  // --- Modal Logic ---
  const openModal = useCallback(() => { setIsModalOpen(true); }, []);
  const closeModal = useCallback(() => { setIsModalOpen(false); }, []);

  // --- Resizing Logic --- (persistent listeners approach) ---
  const handleMouseMove = useCallback((e) => { if(!isResizingRef.current) return; let nw=e.clientX; nw=Math.max(200,Math.min(600,nw)); setSidebarWidth(nw);}, []);
  const handleMouseUp = useCallback(() => { if(isResizingRef.current){setIsResizing(false); document.body.style.userSelect=''; document.body.style.cursor='';}}, []);
  useEffect(() => { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; }, [handleMouseMove, handleMouseUp]);
  const handleMouseDown = useCallback((e) => { e.preventDefault(); flushSync(() => { setIsResizing(true); }); document.body.style.userSelect='none'; document.body.style.cursor='col-resize';}, []);


  // --- Data Fetching & Topic Selection Logic ---

  // Fetches the 3-level folder structure from the backend API.
  const fetchStructure = useCallback(async () => {
    console.log("Fetching structure from backend..."); // Log API call
    setIsLoading(true); setError(null); // Set loading, clear errors.
    try {
      // --- ACTUAL API CALL for Structure --- Ensure URL is correct! ---
      const response = await fetch('/api/structure'); // Use relative or absolute URL to backend
      if (!response.ok) {
          // Try to get error details from response if possible
          let errorMsg = `HTTP error! Status: ${response.status}`;
           try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch(e) { /* Ignore if not JSON */ }
           throw new Error(errorMsg);
       }
      const data = await response.json(); // Get the JSON data!
      console.log("Received structure data:", data);
      setFolderStructure(data || {}); // Update state. Handle null response.
    } catch (err) {
      console.error("Fetch structure failed!", err); // Log the error!
      setError(`Couldn't load lecture structure: ${err.message}.`); // Tell the user!
      setFolderStructure({}); // Reset structure on error!
    } finally {
      setIsLoading(false); // Done loading.
    }
  }, []); // Stable function identity.

  // Initial fetch on mount 
  useEffect(() => {
    console.log("App mounted. Fetching initial structure from backend.");
    fetchStructure(); // Call the fetch function!
  }, [fetchStructure]); // Dependency array includes fetchStructure

  // Fetch content effect - *** RESTORED API CALL & ARRAY HANDLING ***
  useEffect(() => {
    // If nothing is selected (no topic chosen), clear the content. Don't fetch.
    if (!selectedItem || !selectedItem.subject || !selectedItem.class || !selectedItem.topic) {
      setCurrentContent(null); // Clear content if selection is incomplete or null
      return; // Stop here!
    }

    // Define the async function to fetch content for the selected Subject/Class/Topic.
    const fetchContent = async () => {
      console.log("Selection changed to:", selectedItem, ". Fetching content array from backend...");
      setIsLoading(true); setError(null); setCurrentContent(null); // Set loading, clear error/content.
      try {
        // Destructure all three levels from the selectedItem state!
        const { subject, class: className, topic } = selectedItem; // Use 'className' alias.
        // --- ACTUAL API CALL for Content --- Build URL with all 3 params! Check endpoint! ---
        const apiUrl = `/api/content?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`;
        console.log("Fetching content from:", apiUrl);
        const response = await fetch(apiUrl); // Use relative or absolute URL
        if (!response.ok) {
             let errorMsg = `HTTP error! Status: ${response.status}`;
             try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch(e) { /* Ignore */ }
             throw new Error(`${errorMsg} for ${subject}/${className}/${topic}`);
         }
        // *** EXPECTING AN ARRAY of note objects now! ***
        const data = await response.json();
        console.log("Received content data (expecting array):", data);
        // Validate if it's an array before setting state
        if (Array.isArray(data)) {
             setCurrentContent(data); // Update state with the array!
        } else {
            // If backend sends single object or wrong format unexpectedly
            console.error("API response for content was not an array:", data);
            throw new Error("Received invalid data format from server.");
        }
      } catch (err) {
        console.error("Fetch content failed.", err); // Log error
        setError(`Couldn't load content: ${err.message}`); // Set error message for UI
        setCurrentContent(null); // Clear content on error.
      } finally {
        setIsLoading(false); // Done loading content.
      }
    };

    fetchContent(); // Call the fetch function!

  }, [selectedItem]); // Dependency: run when selectedItem (with all 3 levels) changes!


  // Handle topic clicks from Sidebar - (Unchanged - still sets the 3-level selectedItem state).
  const handleSelectTopic = useCallback((subject, className, topic) => {
    console.log(`Topic selected: ${subject}/${className}/${topic}`);
    const newItem = { subject, class: className, topic }; // Use 'class', 'topic' for state keys
    if (selectedItem?.subject !== subject || selectedItem?.class !== className || selectedItem?.topic !== topic) {
      setSelectedItem(newItem); // Update state, triggers content fetch effect!
    } else {
      console.log("...same topic selected."); // Log if same topic clicked.
    }
  }, [selectedItem]); // Depends on selectedItem to check against current selection.
  // --- End Data/Selection Logic ---


  // --- THE RENDERED JSX --- What the user actually sees! ---
  return (
    // Fragment because Modal & Theme Button are siblings to the main layout.
    <>
      {/* Main app layout container */}
      <div className="app-container" ref={appContainerRef}>

        {/* Sidebar Component - Will display data from folderStructure state */}
        <Sidebar
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          structure={folderStructure} // Pass the (initially empty, then fetched) structure
          onSelectTopic={handleSelectTopic} // Pass the selection handler
          selectedItem={selectedItem} // Pass current selection state
          onResizeMouseDown={handleMouseDown} // Pass resize handler
          onOpenUploadModal={openModal} // Pass modal opener
        />

        {/* Content Display Component - Will display data from currentContent state */}
        <ContentDisplay
          content={currentContent} // Pass the content array (or null) fetched from backend
          selectedItem={selectedItem}
          isLoading={isLoading}
          error={error}
        />

      </div> {/* End app-container */}


      {/* Theme Toggle Button - Unchanged */}
      <button
        onClick={toggleTheme}
        className="theme-toggle-button"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Upload Modal - Upload/Success will now interact with live backend/fetchStructure */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onUploadSuccess={fetchStructure} // fetchStructure will now hit the backend API
      />

    </> // End React Fragment
  ); // End return
} // End App component

// Export App!
export default App;
