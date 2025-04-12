// src/App.jsx

// Imports first! React hooks (useState, useEffect, useCallback, useRef), flushSync for our resize fix, components, and styles. Gotta have 'em.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom'; // Needed for the resize consistency fix.
import Sidebar from './components/Sidebar'; // Our trusty Sidebar component.
import ContentDisplay from './components/ContentDisplay'; // Where the stuff shows up.
import UploadModal from './components/UploadModal'; // The popup modal for uploads.
import './App.css'; // Styles, including dark mode. Very important.

// === App Component === The main hub, coordinating everything! ===
function App() {
  // --- Theme State --- Let's manage light/dark mode. ---
  // State to track the current theme: 'light' or 'dark'.
  // Defaulting to dark mode because dark mode is pretty neat.
  const [theme, setTheme] = useState('dark');
  // --- End Theme State ---

  // --- Modal State --- Is the upload popup visible? ---
  const [isModalOpen, setIsModalOpen] = useState(false); // Starts closed!
  // --- End Modal State ---

  // --- Resizable Sidebar State & Refs --- Getting draggy with it! ---
  // How wide is the sidebar right now? Starts at 280 pixels, a decent default.
  const [sidebarWidth, setSidebarWidth] = useState(280);
  // The official React state flag: ARE we currently resizing? True/False.
  const [isResizing, setIsResizing] = useState(false);
  // *** IMPORTANT for Resize Fix ***: A Ref to mirror the resizing state!
  // We only need to declare this ONCE! This holds the *current* value for listeners.
  const isResizingRef = useRef(isResizing); // <--- ONLY ONE DECLARATION HERE!
  // Keep the ref updated whenever the actual state changes!
  useEffect(() => {
    isResizingRef.current = isResizing; // Sync ref to state!
  }, [isResizing]);

  // Refs for the DOM elements, just in case we need them later.
  const appContainerRef = useRef(null); // Bookmark for the main container div.
  const sidebarRef = useRef(null); // Bookmark for the sidebar element.
  // --- End Sidebar Stuff ---

  // --- Core Application State --- The app's data brain! ---
  // Folder structure! Expecting { Subject: { Class: { Topic: {} } } } now!
  const [folderStructure, setFolderStructure] = useState({});
  // Which item is selected? Now tracks all 3 levels! { subject: '...', class: '...', topic: '...' }
  const [selectedItem, setSelectedItem] = useState(null);
  // Content for the selected item! Now expecting an ARRAY of note objects! [ { uploadDate: ..., ... }, ... ]
  const [currentContent, setCurrentContent] = useState(null);
  // Is the app busy fetching data or processing? For loading indicators. Starts false.
  const [isLoading, setIsLoading] = useState(false);
  // Did an error occur somewhere? Store the message here. Starts null (no error).
  const [error, setError] = useState(null);
  // --- End Core State ---


  // --- Theme Management Logic --- Handling light/dark switching. --- (Unchanged Logic) ---
  // useEffect: Set initial theme based on localStorage/system preference. Runs ONCE.
  useEffect(() => {
    console.log("Checking initial theme preference (defaulting dark)...");
    const savedTheme = localStorage.getItem('lectureAppTheme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let initialTheme = 'dark'; // Our default
    if (savedTheme) {
      console.log("Found saved theme:", savedTheme);
      initialTheme = savedTheme; // Override if saved
    } else {
      console.log("No saved theme. Sticking with default 'dark'.");
      // if (!prefersDark) initialTheme = 'light'; // Optional: Respect system light preference
    }
    setTheme(currentTheme => currentTheme !== initialTheme ? initialTheme : currentTheme); // Update only if needed
  }, []); // Empty deps [] = runs once on mount!

  // useEffect: Apply theme class to body and save to localStorage whenever theme state changes.
  useEffect(() => {
    console.log(`Applying theme: ${theme}`);
    document.body.classList.toggle('dark-mode', theme === 'dark'); // Apply/remove class
    try {
      localStorage.setItem('lectureAppTheme', theme); // Save preference
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  }, [theme]); // Depends on theme state!

  // Function to TOGGLE the theme state. Passed to the button.
  const toggleTheme = useCallback(() => {
    console.log("Toggling theme!");
    setTheme(prev => (prev === 'light' ? 'dark' : 'light')); // Flip the state
  }, []); // Stable function identity.
  // --- End Theme Management Logic ---


  // --- Modal Logic --- Popup control! --- (Unchanged Logic) ---
  const openModal = useCallback(() => { console.log("Opening modal."); setIsModalOpen(true); }, []);
  const closeModal = useCallback(() => { console.log("Closing modal."); setIsModalOpen(false); }, []);
  // --- End Modal Logic ---


  // --- Resizing Logic --- REVISED APPROACH! Persistent Listeners! --- (Unchanged Logic) ---

  // MouseMove Handler: Logic is the same, but it's *always* attached to the window now. Checks ref.
  const handleMouseMove = useCallback((e) => {
    if (!isResizingRef.current) return; // Check the ref!
    let newWidth = e.clientX;
    const minWidth = 200; const maxWidth = 600;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setSidebarWidth(newWidth); // Set state to trigger re-render
  }, []); // Stable function identity.

  // MouseUp Handler: Also always attached, checks ref, updates state.
  const handleMouseUp = useCallback(() => {
    if (isResizingRef.current) { // Check the ref!
      console.log("Mouse Up detected by persistent listener! Stopping resize.");
      setIsResizing(false); // Update the actual state
      document.body.style.userSelect = ''; // Reset styles
      document.body.style.cursor = '';
    }
  }, []); // Stable function identity.

  // useEffect: Attach listeners ONCE on mount, remove ONCE on unmount. Cleaner!
  useEffect(() => {
    console.log("Attaching persistent mousemove/mouseup listeners to window.");
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    // Cleanup function: Remove listeners when App unmounts.
    return () => {
      console.log("Cleaning up persistent mousemove/mouseup listeners.");
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]); // Depends on stable handler identities.

  // MouseDown Handler (triggered by the handle in Sidebar): Now ONLY sets the state!
  const handleMouseDown = useCallback((e) => {
    console.log('--- handleMouseDown (Resizer Handle Clicked) ---');
    e.preventDefault(); // Stop default browser stuff.
    // Set the state to true! Use flushSync to help ensure ref is updated fast.
    flushSync(() => {
        setIsResizing(true); // Update the state synchronously.
        console.log('State SET to isResizing=true');
    });
    // Apply the initial dragging styles immediately.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []); // Stable function identity.
  // --- End Resizing Logic ---


  // --- Data Fetching & Topic Selection Logic --- Backend comms and UI interaction. --- (Unchanged Logic) ---
  // Fetches 3-level folder structure, also used as upload success callback.
  const fetchStructure = useCallback(async () => { console.log("Fetching/Refreshing structure..."); setIsLoading(true); setError(null); try { const r=await fetch('/api/structure'); if(!r.ok) throw new Error(`HTTP ${r.status}`); const d=await r.json(); setFolderStructure(d||{}); } catch(err) { console.error("Fetch structure failed!", err); setError(`Couldn't load structure: ${err.message}`); setFolderStructure({}); } finally { setIsLoading(false); }}, []);
  // Initial fetch on mount.
  useEffect(() => { console.log("App mounted. Fetching initial structure."); fetchStructure(); }, [fetchStructure]);
  // Fetch content (expecting array) when 3-level selection changes.
  useEffect(() => { if(!selectedItem || !selectedItem.subject || !selectedItem.class || !selectedItem.topic){setCurrentContent(null); return;} const fc=async()=>{ setIsLoading(true);setError(null);setCurrentContent(null); try{const {subject, class: className, topic}=selectedItem; const apiUrl = `/api/content?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`; console.log("Fetching content from:", apiUrl); const r=await fetch(apiUrl); if(!r.ok) throw new Error(`HTTP ${r.status}`); const d=await r.json(); if(Array.isArray(d)){setCurrentContent(d);}else{throw new Error("Invalid data format");}}catch(err){console.error("Fetch content failed!",err); setError(`Couldn't load content: ${err.message}`);setCurrentContent(null);}finally{setIsLoading(false);}}; fc(); }, [selectedItem]);
  // Handle 3-level topic clicks from Sidebar.
  const handleSelectTopic = useCallback((subject, className, topic) => { console.log(`Topic selected: ${subject}/${className}/${topic}`); const newItem={subject, class: className, topic}; if(selectedItem?.subject!==subject || selectedItem?.class !== className || selectedItem?.topic !== topic){setSelectedItem(newItem);} else { console.log("...same topic selected."); }}, [selectedItem]);
  // --- End Data/Selection Logic ---


  // --- THE RENDERED JSX --- What the user actually sees! ---
  return (
    // Fragment because Modal & Theme Button are siblings to the main layout.
    <>
      {/* Main app layout container */}
      <div className="app-container" ref={appContainerRef}>

        {/* Sidebar Component */}
        <Sidebar
          ref={sidebarRef} // Pass ref.
          style={{ width: `${sidebarWidth}px` }} // Pass dynamic width style.
          structure={folderStructure} // Pass the 3-level folder data.
          onSelectTopic={handleSelectTopic} // Pass the 3-level click handler.
          selectedItem={selectedItem} // Pass the 3-level current selection.
          onResizeMouseDown={handleMouseDown} // Pass the function that STARTS resizing.
          onOpenUploadModal={openModal} // Pass the function to OPEN the modal.
        />

        {/* Content Display Component */}
        <ContentDisplay
          content={currentContent} // Pass the content array (or null).
          selectedItem={selectedItem} // Pass selected item info.
          isLoading={isLoading} // Pass loading state.
          error={error} // Pass any error message.
        />

      </div> {/* End app-container */}


      {/* --- Theme Toggle Button --- Always visible! */}
      <button
        onClick={toggleTheme} // Toggle theme on click.
        className="theme-toggle-button" // Class for styling via CSS.
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} // Good for accessibility.
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} // Tooltip for desktop users.
      >
        {/* Show sun or moon emoji based on current theme state! */}
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      {/* --- End Theme Toggle Button --- */}


      {/* --- Upload Modal --- Only visible when isOpen is true! --- */}
      <UploadModal
        isOpen={isModalOpen} // Controls visibility.
        onClose={closeModal} // How the modal closes itself.
        onUploadSuccess={fetchStructure} // What to do after successful upload (refresh sidebar!).
      />
      {/* --- End Upload Modal --- */}

    </> // End React Fragment
  ); // End of the return statement
} // End of the App function component

// Export App! Make it available for index.js/main.jsx to render! Done!
export default App; // Hopefully fixed for real this time!
