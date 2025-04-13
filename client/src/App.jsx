// Imports first! React hooks (useState, useEffect, useCallback, useRef), flushSync for our resize fix, components, and styles.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom'; // Needed for the resize consistency fix.
import Sidebar from './components/Sidebar'; // Our trusty Sidebar component.
import ContentDisplay from './components/ContentDisplay'; // Where the stuff shows up.
import UploadModal from './components/UploadModal'; // The popup modal for uploads.
import './App.css'; // Styles, including dark mode. Very important.

// === App Component === Handling backend data transformation! ===
function App() {
  // --- State Definitions (Theme, Modal, Resizing) ---
  const [theme, setTheme] = useState('dark'); // Defaulting to dark mode.
  const [isModalOpen, setIsModalOpen] = useState(false); // Upload modal state.
  const [sidebarWidth, setSidebarWidth] = useState(280); // Sidebar width state.
  const [isResizing, setIsResizing] = useState(false); // Flag for active resizing.
  const isResizingRef = useRef(isResizing); // Ref mirrors state for reliable listener checks.
  useEffect(() => { isResizingRef.current = isResizing; }, [isResizing]); // Keep ref synced.
  const appContainerRef = useRef(null);
  const sidebarRef = useRef(null);

  // --- Core Application State ---
  const [folderStructure, setFolderStructure] = useState({}); // Start empty! Will build on fetch.
  const [selectedItem, setSelectedItem] = useState(null); // { subject, class, topic } or null.
  const [currentContent, setCurrentContent] = useState(null); // Expects Array of note objects or null.
  const [isLoading, setIsLoading] = useState(false); // General loading state.
  const [isDeleting, setIsDeleting] = useState(false); // Specific loading state for delete actions.
  const [error, setError] = useState(null); // Error message state.
  // --- End State Definitions ---


  // --- Theme Management Logic --- (Unchanged) ---
  useEffect(() => { /* ... initial theme check ... */ }, []);
  useEffect(() => { document.body.classList.toggle('dark-mode', theme === 'dark'); try {localStorage.setItem('lectureAppTheme', theme);} catch(e){} }, [theme]);
  const toggleTheme = useCallback(() => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); }, []);

  // --- Modal Logic --- (Unchanged) ---
  const openModal = useCallback(() => { setIsModalOpen(true); }, []);
  const closeModal = useCallback(() => { setIsModalOpen(false); }, []);

  // --- Resizing Logic --- (Unchanged - persistent listeners approach) ---
  const handleMouseMove = useCallback((e) => { if(!isResizingRef.current) return; let nw=e.clientX; nw=Math.max(200,Math.min(600,nw)); setSidebarWidth(nw);}, []);
  const handleMouseUp = useCallback(() => { if(isResizingRef.current){setIsResizing(false); document.body.style.userSelect=''; document.body.style.cursor='';}}, []);
  useEffect(() => { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; }, [handleMouseMove, handleMouseUp]);
  const handleMouseDown = useCallback((e) => { e.preventDefault(); flushSync(() => { setIsResizing(true); }); document.body.style.userSelect='none'; document.body.style.cursor='col-resize';}, []);


  // --- Data Fetching & Topic Selection Logic --- *** fetchStructure MODIFIED *** ---

  // Fetches data from backend and TRANSFORMS it into the 3-level folder structure.
  const fetchStructure = useCallback(async (calledFrom = 'unknown') => {
    console.log(`Fetching raw data from /transcripts...`);
    setIsLoading(true); setError(null);
    try {
      // --- Fetch the data (expecting an array of notes) ---
      // TODO: Replace '/api/structure' with `${import.meta.env.VITE_API_BASE_URL}/api/structure` or similar env var.
      const response = await fetch('http://127.0.0.1:5000/transcripts');
      if (!response.ok) {
          let errorMsg = `HTTP error! Status: ${response.status}`;
           try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch(e) { /* Ignore if not JSON */ }
           throw new Error(errorMsg);
       }
      const flatNoteList = await response.json(); // Expecting an ARRAY like [{ subject, class, topic, ...}, ...]
      console.log("Received raw data from http://127.0.0.1:5000/transcripts:", flatNoteList);

      // --- !!! DATA TRANSFORMATION LOGIC !!! ---
      // Check if we actually got an array
      if (!Array.isArray(flatNoteList)) {
          console.error("http://127.0.0.1:5000/transcripts/ did not return an array!", flatNoteList);
          throw new Error("Invalid structure data format received from server.");
      }

      // Build the required nested structure
      const nestedStructure = {};
      flatNoteList.forEach(note => {
          // --- IMPORTANT: Use the CORRECT keys from the backend response ---
          // Adjust these ('subject', 'class', 'topic') if backend uses different names like 'nameClass'
          const subject = note.subject;
          const className = note.class; // Assuming backend sends 'class' key
          const topicName = note.topic; // Assuming backend sends 'topic' key

          // Ensure all parts exist before adding to structure
          if (subject && className && topicName) {
              // Create subject level if it doesn't exist
              if (!nestedStructure[subject]) {
                  nestedStructure[subject] = {};
              }
              // Create class level if it doesn't exist
              if (!nestedStructure[subject][className]) {
                  nestedStructure[subject][className] = {};
              }
              // Add topic (empty object signifies its existence in the hierarchy)
              nestedStructure[subject][className][topicName] = {};
          } else {
              // Log a warning if a note is missing necessary fields for structuring
              console.warn("Skipping note in structure due to missing subject/class/topic:", note);
          }
      });
      // --- !!! END TRANSFORMATION LOGIC !!! ---

      console.log("Transformed nested structure for Sidebar:", nestedStructure);
      setFolderStructure(nestedStructure || {}); // Update state with the *nested* structure!

    } catch (err) {
      console.error("Fetch or transform structure failed!", err); // Log the error!
      setError(`Couldn't load lecture structure: ${err.message}.`); // Tell the user!
      setFolderStructure({}); // Reset structure on error!
    } finally {
      setIsLoading(false); // Done loading.
    }
  }, []); // Stable function identity.

  // Initial fetch on mount - Runs the modified fetchStructure.
  useEffect(() => {
    console.log("App mounted. Fetching initial structure data from backend.");
    fetchStructure('initialMount');
  }, [fetchStructure]); // Dependency array includes fetchStructure

  // Fetch content effect - Assumes /api/content returns the CORRECT array format needed by ContentDisplay.
  useEffect(() => {
    if (!selectedItem || !selectedItem.subject || !selectedItem.class || !selectedItem.topic) { setCurrentContent(null); return; }
    const fetchContent = async () => {
      console.log("Selection changed. Fetching content for:", selectedItem);
      setIsLoading(true); setError(null); setCurrentContent(null);
      try {
        const { subject, class: className, topic } = selectedItem;
        // TODO: Replace base URL with env var
        const apiUrl = `http://127.0.0.1:5000/content?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`;
        console.log("Fetching content from:", apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
        const data = await response.json();
        if (!Array.isArray(data)) { throw new Error("Invalid content data format"); }
        console.log("Received content data:", data);
        setCurrentContent(data); // Update state with the array!
      } catch (err) {
        console.error("Fetch content failed.", err);
        setError(`Couldn't load content: ${err.message}`);
        setCurrentContent(null);
      } finally { setIsLoading(false); }
    };
    fetchContent();
  }, [selectedItem]);

  // Handle topic clicks from Sidebar (Unchanged - uses internal state keys).
  const handleSelectTopic = useCallback((subject, className, topic) => { console.log(`Topic selected: ${subject}/${className}/${topic}`); const newItem={subject, class: className, topic}; if(selectedItem?.subject!==subject || selectedItem?.class !== className || selectedItem?.topic !== topic){setSelectedItem(newItem);} else { console.log("...same topic selected."); }}, [selectedItem]);


  // --- Delete Handlers --- (Ensure URLs match backend!)
  // Generic Delete Function (Helper)
  const performDelete = async (url, itemDescription, successCallback) => {
    if (!window.confirm(`Are you sure you want to delete "${itemDescription}"? This action cannot be undone.`)) { return; }
    console.log(`Attempting to DELETE: ${url}`);
    setIsDeleting(true); setError(null);
    try {
      // TODO: Prepend base URL from env var if needed
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) {
          let errorMsg = `HTTP error! Status: ${response.status}`;
          try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch (e) {}
          throw new Error(errorMsg);
      }
      console.log(`Successfully deleted: ${itemDescription}`);
      alert(`"${itemDescription}" deleted successfully.`);
      if (successCallback) { successCallback(); }
    } catch (err) {
      console.error(`Failed to delete ${itemDescription}:`, err);
      setError(`Failed to delete "${itemDescription}": ${err.message}`);
      alert(`Error deleting "${itemDescription}": ${err.message}`);
    } finally { setIsDeleting(false); }
  };
  // Specific Delete Handlers
  const handleDeleteNote = useCallback(async (noteId, noteIdentifier = 'this note') => { const url = `/delete_document/${noteId}`; /* TODO: Base URL */ await performDelete(url, noteIdentifier, () => { if (selectedItem) { const currentSelection = { ...selectedItem }; setSelectedItem(null); setTimeout(() => setSelectedItem(currentSelection), 0); } }); }, [selectedItem]);
  const handleDeleteTopic = useCallback(async (subject, className, topic) => { const url = `/api/topics?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`; /* TODO: Base URL */ const desc = `Topic: ${topic}`; await performDelete(url, desc, () => { if (selectedItem?.subject === subject && selectedItem?.class === className && selectedItem?.topic === topic) { setSelectedItem(null); setCurrentContent(null); } fetchStructure('afterTopicDelete'); }); }, [selectedItem, fetchStructure]);
  const handleDeleteClass = useCallback(async (subject, className) => { const url = `/api/classes?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}`; /* TODO: Base URL */ const desc = `Class: ${className}`; await performDelete(url, desc, () => { if (selectedItem?.subject === subject && selectedItem?.class === className) { setSelectedItem(null); setCurrentContent(null); } fetchStructure('afterClassDelete'); }); }, [selectedItem, fetchStructure]);
  const handleDeleteSubject = useCallback(async (subject) => { const url = `/api/subjects?subject=${encodeURIComponent(subject)}`; /* TODO: Base URL */ const desc = `Subject: ${subject}`; await performDelete(url, desc, () => { if (selectedItem?.subject === subject) { setSelectedItem(null); setCurrentContent(null); } fetchStructure('afterSubjectDelete'); }); }, [selectedItem, fetchStructure]);
  // --- End Delete Handlers ---


  // --- THE RENDERED JSX --- What the user actually sees! ---
  return (
    <>
      {/* Deleting Overlay */}
      {isDeleting && <div className="delete-overlay">Deleting... Please Wait...</div>}

      {/* Main app layout container */}
      <div className={`app-container ${isDeleting ? 'deleting' : ''}`} ref={appContainerRef}>

        {/* Sidebar Component - Pass the *transformed* nested structure */}
        <Sidebar
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          structure={folderStructure} // Pass the structure built by fetchStructure
          onSelectTopic={handleSelectTopic}
          selectedItem={selectedItem}
          onResizeMouseDown={handleMouseDown}
          onOpenUploadModal={openModal}
          onDeleteSubject={handleDeleteSubject}
          onDeleteClass={handleDeleteClass}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* Content Display Component - Pass the array fetched from /api/content */}
        <ContentDisplay
          content={currentContent}
          selectedItem={selectedItem}
          isLoading={isLoading && !isDeleting}
          error={error}
          onDeleteNote={handleDeleteNote}
        />

      </div> {/* End app-container */}


      {/* Theme Toggle Button */}
      <button onClick={toggleTheme} className="theme-toggle-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Upload Modal */}
      <UploadModal isOpen={isModalOpen} onClose={closeModal} onUploadSuccess={() => fetchStructure('afterUpload')} />

    </> // End React Fragment
  ); // End return
} // End App component

// Export App!
export default App;
