// src/App.jsx

// Imports first! React hooks (useState, useEffect, useCallback, useRef), flushSync for our resize fix, components, and styles.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom'; // Needed for the resize consistency fix.
import Sidebar from './components/Sidebar'; // Our trusty Sidebar component.
import ContentDisplay from './components/ContentDisplay'; // Where the stuff shows up.
import UploadModal from './components/UploadModal'; // The popup modal for uploads.
import './App.css'; // Styles, including dark mode. Very important.

// === !!! DEFINE BACKEND BASE URL !!! ===
// This tells the frontend where to send API requests.
// Replace 'http://127.0.0.1:5000' if your backend runs elsewhere.
// TODO: Move this to an environment variable later (.env file) for flexibility!
const API_BASE_URL = 'http://127.0.0.1:5000';
// === End Base URL Definition ===


// === App Component === Fixing structure endpoint, adding content fetch debug! ===
function App() {
  // --- State Definitions (Theme, Modal, Resizing - Unchanged) ---
  const [theme, setTheme] = useState('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(isResizing);
  useEffect(() => { isResizingRef.current = isResizing; }, [isResizing]);
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


  // --- Data Fetching & Topic Selection Logic --- *** fetchStructure Endpoint Fixed *** ---

  // Fetches data from backend and TRANSFORMS it into the 3-level folder structure.
  const fetchStructure = useCallback(async (calledFrom = 'unknown') => {
    console.log(`Fetching raw data for structure from /transcripts... (Called from: ${calledFrom})`); // Log correct intent
    setIsLoading(true); setError(null);
    try {
      // --- *** USE CORRECT ENDPOINT FOR STRUCTURE DATA: /transcripts *** ---
      const structureUrl = `${API_BASE_URL}/transcripts`; // <-- CHANGED FROM /api/structure
      console.log("Fetching structure data from:", structureUrl);
      const response = await fetch(structureUrl);
      // --- End Endpoint Change ---

      if (!response.ok) {
          let errorMsg = `HTTP error! Status: ${response.status}`;
           try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch(e) { /* Ignore if not JSON */ }
           throw new Error(errorMsg);
       }
      const flatNoteList = await response.json(); // Expecting an ARRAY like [{ subject, class, topic, ...}, ...]
      console.log("Received raw data from /transcripts:", flatNoteList);

      // --- Data Transformation Logic (Still Needed!) ---
      if (!Array.isArray(flatNoteList)) { throw new Error("/transcripts did not return an array!"); }
      const nestedStructure = {};
      flatNoteList.forEach(note => {
          const subject = note.subject; const className = note.class; const topicName = note.topic;
          if (subject && className && topicName) {
              if (!nestedStructure[subject]) { nestedStructure[subject] = {}; }
              if (!nestedStructure[subject][className]) { nestedStructure[subject][className] = {}; }
              nestedStructure[subject][className][topicName] = {};
          } else { console.warn("Skipping note in structure build due to missing fields:", note); }
      });
      // --- End Transformation Logic ---

      console.log("Transformed nested structure for Sidebar:", nestedStructure);
      setFolderStructure(nestedStructure || {}); // Update state with the *nested* structure!

    } catch (err) {
      console.error("Fetch or transform structure failed!", err);
      setError(`Couldn't load lecture structure: ${err.message}. Check backend /transcripts endpoint.`); // Update error msg
      setFolderStructure({}); // Reset structure on error!
    } finally {
      setIsLoading(false); // Done loading.
    }
  }, []); // Stable function identity.

  // Initial fetch on mount - Runs the modified fetchStructure.
  useEffect(() => {
    console.log("App mounted. Fetching initial structure data from backend.");
    fetchStructure('initialMount'); // Fetch structure on load
  }, [fetchStructure]);

  // Fetch content effect - Fetches notes (array) when 3-level selection changes. Added DEBUG LOGS.
  useEffect(() => {
    if (!selectedItem || !selectedItem.subject || !selectedItem.class || !selectedItem.topic) { setCurrentContent(null); return; }
    const fetchContent = async () => {
      console.log("Selection changed. Fetching content for:", selectedItem);
      setIsLoading(true); setError(null); setCurrentContent(null);
      let response; // Define response outside try block for logging in catch
      try {
        const { subject, class: className, topic } = selectedItem;
        // --- Use Base URL for Content API Call --- Assume /api/content is correct path now ---
        const apiUrl = `${API_BASE_URL}/api/content?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`;
        console.log("Fetching content from:", apiUrl);
        response = await fetch(apiUrl); // Assign to outer scope variable

        // --- DEBUG: Check status before trying to parse ---
        console.log("Content Fetch Response Status:", response.status, response.statusText);

        if (!response.ok) {
             // Try reading response text even for errors, helps debugging
             let errorBody = await response.text();
             console.error("Content Fetch Error Response Body:", errorBody); // Log the raw error response
             let errorMsg = `HTTP error! Status: ${response.status}`;
             try { // Still try to parse JSON error detail if backend sends it despite status code
                 const errData = JSON.parse(errorBody); // Try parsing the text we got
                 errorMsg = errData.error || errData.message || errorMsg;
             } catch(e) { /* Ignore parse error, use status/text */
                 errorMsg = `HTTP ${response.status} ${response.statusText}. Response: ${errorBody.substring(0, 100)}...`; // Include beginning of non-JSON response
             }
             throw new Error(`${errorMsg} for ${subject}/${className}/${topic}`);
         }

        // --- DEBUG: Get response as TEXT first to see what it is ---
        const responseText = await response.text();
        console.log("Received raw response text from /api/content:", responseText.substring(0, 500)); // Log first 500 chars

        // --- Now try to parse the text as JSON ---
        const data = JSON.parse(responseText); // This is where the original error happened!
        // --- End Debug Block ---

        if (!Array.isArray(data)) { throw new Error("Received invalid data format (expected array)"); }
        console.log("Successfully parsed content data:", data);
        setCurrentContent(data); // Update state with the array!

      } catch (err) {
        console.error("Fetch content failed (in try/catch):", err); // Log error caught
        setError(`Couldn't load content: ${err.message}`); // Set error message for UI
        setCurrentContent(null); // Clear content on error.
      } finally {
        setIsLoading(false); // Done loading content.
      }
    };
    fetchContent();
  }, [selectedItem]); // Dependency: run when selectedItem changes!

  // Handle topic clicks from Sidebar (Unchanged).
  const handleSelectTopic = useCallback((subject, className, topic) => { console.log(`Topic selected: ${subject}/${className}/${topic}`); const newItem={subject, class: className, topic}; if(selectedItem?.subject!==subject || selectedItem?.class !== className || selectedItem?.topic !== topic){setSelectedItem(newItem);} else { console.log("...same topic selected."); }}, [selectedItem]);


  // --- Delete Handlers --- (Unchanged - still need correct URLs) ---
  const performDelete = async (relativePath, itemDescription, successCallback) => { /* ... includes fetch call with BASE_URL + relativePath ... */ };
  const handleDeleteNote = useCallback(async (noteId, noteIdentifier = 'this note') => { const relPath = `/delete_document/${noteId}`; await performDelete(relPath, noteIdentifier, () => { /* ... refresh ... */ }); }, [selectedItem]);
  const handleDeleteTopic = useCallback(async (subject, className, topic) => { const relPath = `/api/topics?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`; const desc = `Topic: ${topic}`; await performDelete(relPath, desc, () => { /* ... refresh ... */ fetchStructure('afterTopicDelete'); }); }, [selectedItem, fetchStructure]);
  const handleDeleteClass = useCallback(async (subject, className) => { const relPath = `/api/classes?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}`; const desc = `Class: ${className}`; await performDelete(relPath, desc, () => { /* ... refresh ... */ fetchStructure('afterClassDelete'); }); }, [selectedItem, fetchStructure]);
  const handleDeleteSubject = useCallback(async (subject) => { const relPath = `/api/subjects?subject=${encodeURIComponent(subject)}`; const desc = `Subject: ${subject}`; await performDelete(relPath, desc, () => { /* ... refresh ... */ fetchStructure('afterSubjectDelete'); }); }, [selectedItem, fetchStructure]);
  // --- End Delete Handlers ---


  // --- THE RENDERED JSX --- What the user actually sees! ---
  return (
    // Fragment because Modal & Theme Button are siblings to the main layout.
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
          content={currentContent} // Pass the content array (or null) fetched from backend
          selectedItem={selectedItem} // Pass selected item info
          isLoading={isLoading && !isDeleting} // Show loading only if NOT deleting maybe?
          error={error} // Pass error message
          onDeleteNote={handleDeleteNote} // Pass delete handler
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
} // End App component function

// Export App!
export default App;
