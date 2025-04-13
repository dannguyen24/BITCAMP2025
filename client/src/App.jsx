// Imports first! React hooks (useState, useEffect, useCallback, useRef), flushSync for our resize fix, components, and styles.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom'; // Needed for the resize consistency fix.
import Sidebar from './components/Sidebar'; // Our trusty Sidebar component.
import ContentDisplay from './components/ContentDisplay'; // Where the stuff shows up.
import UploadModal from './components/UploadModal'; // The popup modal for uploads.
import './App.css'; // Styles, including dark mode. Very important.

// --- NO MORE MOCK DATA! We're connecting to the real deal! ---


// === App Component === The Grand Central Station! Ready for Backend Data! ===
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

  // --- Core Application State --- Initialize as empty/null, waiting for backend data! ---
  const [folderStructure, setFolderStructure] = useState({}); // Start empty! Will fetch on load.
  const [selectedItem, setSelectedItem] = useState(null); // { subject, class, topic } or null.
  const [currentContent, setCurrentContent] = useState(null); // Expects Array of note objects or null.
  const [isLoading, setIsLoading] = useState(false); // General loading state.
  const [isDeleting, setIsDeleting] = useState(false); // Specific loading state for delete actions.
  const [error, setError] = useState(null); // Error message state.
  // --- End State Definitions ---


  // --- Theme Management Logic  ---
  useEffect(() => { /* ... initial theme check ... */ }, []);
  useEffect(() => { document.body.classList.toggle('dark-mode', theme === 'dark'); try {localStorage.setItem('lectureAppTheme', theme);} catch(e){} }, [theme]);
  const toggleTheme = useCallback(() => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); }, []);

  // --- Modal Logic  ---
  const openModal = useCallback(() => { setIsModalOpen(true); }, []);
  const closeModal = useCallback(() => { setIsModalOpen(false); }, []);

  // --- Resizing Logic --- (persistent listeners approach) ---
  const handleMouseMove = useCallback((e) => { if(!isResizingRef.current) return; let nw=e.clientX; nw=Math.max(200,Math.min(600,nw)); setSidebarWidth(nw);}, []);
  const handleMouseUp = useCallback(() => { if(isResizingRef.current){setIsResizing(false); document.body.style.userSelect=''; document.body.style.cursor='';}}, []);
  useEffect(() => { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; }, [handleMouseMove, handleMouseUp]);
  const handleMouseDown = useCallback((e) => { e.preventDefault(); flushSync(() => { setIsResizing(true); }); document.body.style.userSelect='none'; document.body.style.cursor='col-resize';}, []);


  // --- Data Fetching & Topic Selection Logic --- *** RESTORED API CALLS *** ---

  // Fetches the 3-level folder structure from the backend API. Also used for refresh!
  const fetchStructure = useCallback(async (calledFrom = 'unknown') => {
    console.log(`Fetching structure from backend... (Called from: ${calledFrom})`);
    setIsLoading(true); setError(null); // Set loading, clear errors.
    try {
      // --- ACTUAL API CALL for Structure --- Ensure URL is correct! ---
      // TODO: Replace '/api/structure' with `${import.meta.env.VITE_API_BASE_URL}/api/structure` or similar env var.
      const response = await fetch('/api/structure');
      if (!response.ok) {
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

  // Initial fetch on mount - Fetch the structure when app loads.
  useEffect(() => {
    console.log("App mounted. Fetching initial structure from backend.");
    fetchStructure('initialMount'); // *** RE-ENABLED ***
  }, [fetchStructure]); // Dependency array includes fetchStructure

  // Fetch content effect - Fetches notes (array) when 3-level selection changes.
  useEffect(() => {
    // If selection is incomplete, clear content and don't fetch.
    if (!selectedItem || !selectedItem.subject || !selectedItem.class || !selectedItem.topic) {
      setCurrentContent(null);
      return;
    }
    // Define the async function to fetch content.
    const fetchContent = async () => {
      console.log("Selection changed to:", selectedItem, ". Fetching content array from backend...");
      setIsLoading(true); setError(null); setCurrentContent(null); // Set loading, clear error/content.
      try {
        const { subject, class: className, topic } = selectedItem; // Use 'className' alias.
        // --- ACTUAL API CALL for Content --- Build URL with all 3 params! Check endpoint! ---
        // TODO: Replace base URL with env var like `${import.meta.env.VITE_API_BASE_URL}/api/content...`
        const apiUrl = `/api/content?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`;
        console.log("Fetching content from:", apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) {
             let errorMsg = `HTTP error! Status: ${response.status}`;
             try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch(e) { /* Ignore */ }
             throw new Error(`${errorMsg} for ${subject}/${className}/${topic}`);
         }
        // *** EXPECTING AN ARRAY of note objects now! ***
        const data = await response.json();
        console.log("Received content data (expecting array):", data);
        if (!Array.isArray(data)) { throw new Error("Received invalid data format from server."); } // Validate!
        // Add mock _id if backend doesn't send it yet (REMOVE LATER)
        const contentWithIds = data.map((item, index) => ({ ...item, _id: item._id || `temp_id_${Date.now()}_${index}` }));
        setCurrentContent(contentWithIds); // Update state with the array!
      } catch (err) {
        console.error("Fetch content failed.", err); // Log error
        setError(`Couldn't load content: ${err.message}`); // Set error message for UI
        setCurrentContent(null); // Clear content on error.
      } finally {
        setIsLoading(false); // Done loading content.
      }
    };
    fetchContent(); // Call the fetch function!
  }, [selectedItem]); // Dependency: run when selectedItem changes!

  // Handle topic clicks from Sidebar - Sets the 3-level selectedItem state.
  const handleSelectTopic = useCallback((subject, className, topic) => {
    console.log(`Topic selected: ${subject}/${className}/${topic}`);
    const newItem = { subject, class: className, topic }; // Use 'class', 'topic' for state keys
    if (selectedItem?.subject !== subject || selectedItem?.class !== className || selectedItem?.topic !== topic) {
      setSelectedItem(newItem); // Update state, triggers content fetch effect!
    } else {
      console.log("...same topic selected."); // Log if same topic clicked.
    }
  }, [selectedItem]); // Depends on selectedItem to check against current selection.


  // --- !!! DELETE HANDLERS --- Now making REAL API calls! ---

  // Generic Delete Function (Helper) - Contains confirmation and API call logic.
  const performDelete = async (url, itemDescription, successCallback) => {
    // Confirmation Dialog - VERY IMPORTANT! Stops accidental clicks!
    if (!window.confirm(`Are you sure you want to delete "${itemDescription}"? This action cannot be undone.`)) {
      console.log("Delete cancelled by user for:", itemDescription);
      return; // Stop right here if they click cancel!
    }

    console.log(`Attempting to DELETE: ${url}`);
    setIsDeleting(true); // Set specific deleting state for visual feedback!
    setError(null); // Clear previous errors.
    try {
      // --- ACTUAL API CALL --- Make the DELETE request! ---
      // TODO: Prepend with env var base URL if needed: `${import.meta.env.VITE_API_BASE_URL}${url}`
      const response = await fetch(url, { method: 'DELETE' });

      // Check if the backend said "Okay!"
      if (!response.ok) {
        // Try to get a specific error message from the backend response body.
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch (e) {/* Ignore if response wasn't JSON */}
        throw new Error(errorMsg); // Throw an error to be caught below.
      }

      // If we got here, it worked!
      console.log(`Successfully deleted: ${itemDescription}`);
      alert(`"${itemDescription}" deleted successfully.`); // Simple feedback for the user.

      // Run the success callback function passed in (usually to refresh UI state).
      if (successCallback) {
        successCallback();
      }

    } catch (err) {
      // Uh oh, something went wrong during delete!
      console.error(`Failed to delete ${itemDescription}:`, err);
      setError(`Failed to delete "${itemDescription}": ${err.message}`); // Show error in UI maybe?
      alert(`Error deleting "${itemDescription}": ${err.message}`); // Show error alert.
    } finally {
      setIsDeleting(false); // Finished the delete attempt (success or fail).
    }
  };

  // Handler for deleting a specific note entry - called by ContentDisplay.
  const handleDeleteNote = useCallback(async (noteId, noteIdentifier = 'this note') => {
    console.log(`Requesting delete for note ID: ${noteId}`);
    // ** Uses the specified backend endpoint /delete_document/<_id> **
    if (!noteId) { console.error("handleDeleteNote called without noteId!"); setError("Cannot delete note: Missing ID."); return; }

    // *** UPDATED URL for specific note delete ***
    const url = `/delete_document/${noteId}`; // Use the path provided

    // Call the generic delete helper.
    await performDelete(url, noteIdentifier, () => {
      // After successful delete, refresh the content if we were viewing that topic.
      if (selectedItem) {
        console.log("Refreshing content after note delete...");
        // Re-trigger the useEffect hook to refresh content
        const currentSelection = { ...selectedItem }; // Shallow copy
        setSelectedItem(null); // Clear selection briefly
        setTimeout(() => setSelectedItem(currentSelection), 0); // Re-set selection immediately
      }
      // fetchStructure('afterNoteDelete'); // Optionally refresh structure if backend changes it
    });
  }, [selectedItem]); // Depends on selectedItem to know what to refresh.

  // Handler for deleting a topic folder - called by Sidebar.
  const handleDeleteTopic = useCallback(async (subject, className, topic) => {
    console.log(`Requesting delete for topic: ${subject}/${className}/${topic}`);
    // ** Requires backend endpoint like /api/topics?subject=...&class=...&topic=... **
    // *** ADJUST URL AS NEEDED ***
    const url = `/api/topics?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`;
    const description = `Topic: ${topic}`;
    await performDelete(url, description, () => {
      if (selectedItem?.subject === subject && selectedItem?.class === className && selectedItem?.topic === topic) { setSelectedItem(null); setCurrentContent(null); }
      fetchStructure('afterTopicDelete'); // ALWAYS refresh sidebar structure
    });
  }, [selectedItem, fetchStructure]);

  // Handler for deleting a class folder - called by Sidebar.
  const handleDeleteClass = useCallback(async (subject, className) => {
     console.log(`Requesting delete for class: ${subject}/${className}`);
    // ** Requires backend endpoint like /api/classes?subject=...&class=... **
     // *** ADJUST URL AS NEEDED ***
     const url = `/api/classes?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}`;
     const description = `Class: ${className}`;
     await performDelete(url, description, () => {
         if (selectedItem?.subject === subject && selectedItem?.class === className) { setSelectedItem(null); setCurrentContent(null); }
         fetchStructure('afterClassDelete'); // ALWAYS refresh sidebar structure
     });
  }, [selectedItem, fetchStructure]);

  // Handler for deleting a subject folder - called by Sidebar.
  const handleDeleteSubject = useCallback(async (subject) => {
      console.log(`Requesting delete for subject: ${subject}`);
      // ** Requires backend endpoint like /api/subjects?subject=... **
      // *** ADJUST URL AS NEEDED ***
      const url = `/api/subjects?subject=${encodeURIComponent(subject)}`;
      const description = `Subject: ${subject}`;
      await performDelete(url, description, () => {
          if (selectedItem?.subject === subject) { setSelectedItem(null); setCurrentContent(null); }
          fetchStructure('afterSubjectDelete'); // ALWAYS refresh sidebar structure
      });
  }, [selectedItem, fetchStructure]);
  // --- End Delete Handlers ---


  // --- THE RENDERED JSX --- What the user actually sees! ---
  return (
    // Fragment because Modal & Theme Button are siblings to the main layout.
    <>
      {/* Deleting Overlay */}
      {isDeleting && <div className="delete-overlay">Deleting... Please Wait...</div>}

      {/* Main app layout container */}
      <div className={`app-container ${isDeleting ? 'deleting' : ''}`} ref={appContainerRef}>

        {/* Sidebar Component - Pass delete handlers down! */}
        <Sidebar
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          structure={folderStructure} // Pass fetched structure
          onSelectTopic={handleSelectTopic} // Pass select handler
          selectedItem={selectedItem} // Pass current selection
          onResizeMouseDown={handleMouseDown} // Pass resize mousedown handler
          onOpenUploadModal={openModal} // Pass modal open handler
          // --- Pass Delete Handlers as Props ---
          onDeleteSubject={handleDeleteSubject}
          onDeleteClass={handleDeleteClass}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* Content Display Component - Pass delete handler down! */}
        <ContentDisplay
          content={currentContent} // Pass the content array (or null) fetched from backend
          selectedItem={selectedItem} // Pass selected item info
          isLoading={isLoading && !isDeleting} // Show loading only if NOT deleting maybe?
          error={error} // Pass error message
          // --- Pass Delete Handler as Prop ---
          onDeleteNote={handleDeleteNote}
        />

      </div> {/* End app-container */}


      {/* Theme Toggle Button */}
      <button onClick={toggleTheme} className="theme-toggle-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Upload Modal - Upload/Success will now interact with live backend/fetchStructure */}
      <UploadModal isOpen={isModalOpen} onClose={closeModal} onUploadSuccess={() => fetchStructure('afterUpload')} />

    </> // End React Fragment
  ); // End return
} // End App component function

// Export App!
export default App;
