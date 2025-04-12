// Imports first! React hooks (useState, useEffect, useCallback, useRef), flushSync (maybe still useful?), our components, and styles!
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom'; // Keeping flushSync just in case, might help ensure ref updates quickly too? Idk! 🤷
import Sidebar from './components/Sidebar'; // Our loyal Sidebar!
import ContentDisplay from './components/ContentDisplay'; // The main content viewer!
import UploadModal from './components/UploadModal'; // The snazzy popup modal!
import './App.css'; // Can't forget the styles! Especially dark mode!

// === App Component === The Big Kahuna! Orchestrating the whole show! ===
function App() {
  // --- Theme State --- Light or Dark? Decisions, decisions... ---
  // State tracks 'light' or 'dark'. Defaulting to dark 'cause most things should...
  const [theme, setTheme] = useState('dark');
  // --- End Theme State ---

  // --- Modal State --- Is the upload popup visible? ---
  const [isModalOpen, setIsModalOpen] = useState(false); // Starts closed!
  // --- End Modal State ---

  // --- Resizable Sidebar State & Refs --- Getting draggy with it! ---
  // How wide is the sidebar right now? Starts at 280px.
  const [sidebarWidth, setSidebarWidth] = useState(280);
  // The official React state flag: ARE we currently resizing? True/False.
  const [isResizing, setIsResizing] = useState(false);
  // A Ref to mirror the resizing state!
  // Why? Refs give us the *instantaneous* current value inside event listeners,
  // avoiding potential "stale state" issues from closures when listeners are attached early.
  const isResizingRef = useRef(isResizing);
  // Keep the ref updated whenever the actual state changes!
  useEffect(() => {
    isResizingRef.current = isResizing; // Sync ref to state!
    // console.log(`isResizing state changed to: ${isResizing}, ref updated.`); // Debug log
  }, [isResizing]);

  // Refs for the DOM elements, just in case we need them later.
  const appContainerRef = useRef(null); // Bookmark for the main container div.
  const sidebarRef = useRef(null); // Bookmark for the sidebar element.
  // --- End Sidebar Stuff ---

  // --- Core Application State --- The app's data brain! ---
  const [folderStructure, setFolderStructure] = useState({}); // Folder structure { Subject: { Topic: {} } }
  const [selectedItem, setSelectedItem] = useState(null); // Which topic is selected? { subject: '...', topic: '...' }
  const [currentContent, setCurrentContent] = useState(null); // Content for selected item { transcript: '...', resources: '...' }
  const [isLoading, setIsLoading] = useState(false); // Is the app fetching data?
  const [error, setError] = useState(null); // Did something go wrong? Store error message.
  // --- End Core State ---


  // --- Theme Management Logic ---
  // useEffect: Set initial theme based on localStorage/system preference. Runs ONCE.
  useEffect(() => {
    console.log("Checking initial theme preference (defaulting dark)...");
    const savedTheme = localStorage.getItem('lectureAppTheme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
      console.log("Found saved theme:", savedTheme);
      setTheme(savedTheme);
    } else {
      console.log("No saved theme. Sticking with default 'dark'.");
      // if (!prefersDark) setTheme('light'); // Uncomment this line if you want to default to light mode when system is light.
    }
  }, []); 

  // useEffect: Apply theme class to body and save to localStorage whenever theme state changes.
  useEffect(() => {
    console.log(`Applying theme: ${theme}`);
    document.body.classList.toggle('dark-mode', theme === 'dark'); // Simpler toggle!
    try {
      localStorage.setItem('lectureAppTheme', theme);
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  }, [theme]); // Depends on theme state!

  // Function to toggle the theme state. Passed to the button.
  const toggleTheme = useCallback(() => {
    console.log("Toggling theme!");
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []); // Stable function identity.

  // --- End Theme Management Logic ---


  // --- Modal Logic --- Popup control! --- 
  const openModal = useCallback(() => { console.log("Opening modal."); setIsModalOpen(true); }, []);
  const closeModal = useCallback(() => { console.log("Closing modal."); setIsModalOpen(false); }, []);
  // --- End Modal Logic ---


  // --- Resizing Logic --- Persistent Listeners Approach! ---

  // MouseMove Handler: it's *always* attached to the window 
  const handleMouseMove = useCallback((e) => {
    // *** Check the REF, not the state directly in here! *** Gets the immediate value!
    if (!isResizingRef.current) {
      // console.log("MouseMove ignored: Not resizing according to ref."); // Debug log
      return; // Not resizing? Do nothing!
    }
    // If we ARE resizing (ref is true)... calculate and set the width state!
    // console.log("MouseMove processing!"); // Debug log
    let newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = 600;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setSidebarWidth(newWidth); // Still use setState to trigger React re-renders!
  }, []); // Empty dependency array! This function's identity is stable.

  // MouseUp Handler: Also always attached, checks ref, updates state.
  const handleMouseUp = useCallback(() => {
    // *** Check the REF first! *** Were we actually resizing just now?
    if (isResizingRef.current) {
      console.log("Mouse Up detected by persistent listener! Stopping resize.");
      // If yes, then update the React STATE to false. This syncs React's view.
      setIsResizing(false);
      // Reset the body styles. No need to remove listeners here! They stay.
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    } else {
        // console.log("Mouse Up ignored: Not resizing according to ref."); // Debug log
    }
  }, []); // Empty dependency array! Stable function identity.

  // useEffect: Attach listeners ONCE on mount, remove ONCE on unmount. Cleaner!
  useEffect(() => {
    console.log("Attaching persistent mousemove/mouseup listeners to window.");
    // Attach our stable handler functions to the window.
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // The cleanup function! Runs when App unmounts (or before re-running effect, but deps are empty!).
    return () => {
      console.log("Cleaning up persistent mousemove/mouseup listeners.");
      // Remove the exact same handler functions!
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]); // Depends on the stable identities of the handlers.

  // MouseDown Handler (triggered by the handle in Sidebar): ONLY sets the state!
  // This is the function that gets passed down to the Sidebar component.
  const handleMouseDown = useCallback((e) => {
    console.log('--- handleMouseDown (Resizer Handle Clicked) ---');
    e.preventDefault(); // Stop default browser stuff.

    // Set the state to true! Use flushSync to be extra sure the ref gets updated fast enough.
    // This tells our persistent listeners "Okay, start paying attention!"
    flushSync(() => {
        setIsResizing(true);
        console.log('State SET to isResizing=true');
    });

    // Apply the initial dragging styles immediately.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []); // Empty dependency array! Stable function identity.

  // --- End Resizing Logic ---


  // --- Data Fetching & Topic Selection --- Backend comms and UI interaction. --- (Unchanged Logic) ---
  // Fetches folder structure, also used as upload success callback.
  const fetchStructure = useCallback(async () => { console.log("Fetching/Refreshing structure..."); setIsLoading(true); setError(null); try { const r=await fetch('/api/structure'); if(!r.ok) throw new Error(`HTTP ${r.status}`); const d=await r.json(); setFolderStructure(d||{}); } catch(err) { console.error("Fetch structure failed!", err); setError(`Couldn't load structure: ${err.message}`); setFolderStructure({}); } finally { setIsLoading(false); }}, []);
  // Initial fetch on mount.
  useEffect(() => { console.log("App mounted. Fetching initial structure."); fetchStructure(); }, [fetchStructure]);
  // Fetch content when selection changes.
  useEffect(() => { if(!selectedItem){setCurrentContent(null); return;} const fc=async()=>{ setIsLoading(true);setError(null);setCurrentContent(null); try{const {subject,topic}=selectedItem; const r=await fetch(`/api/content?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`); if(!r.ok) throw new Error(`HTTP ${r.status}`); const d=await r.json();setCurrentContent(d);}catch(err){console.error("Fetch content failed!",err); setError(`Couldn't load content: ${err.message}`);setCurrentContent(null);}finally{setIsLoading(false);}}; fc(); }, [selectedItem]);
  // Handle topic clicks from Sidebar.
  const handleSelectTopic = useCallback((subject, topic) => { console.log(`Topic clicked: ${subject}/${topic}`); if(selectedItem?.subject!==subject || selectedItem?.topic!==topic){setSelectedItem({subject, topic});} else { console.log("...same topic clicked."); }}, [selectedItem]);
  // --- End Data/Selection Logic ---


  // --- THE RENDERED JSX --- What the user actually sees! ---
  return (
    // Fragment needed because Modal and Theme Button are siblings to the main layout.
    <>
      {/* Main app layout container */}
      <div className="app-container" ref={appContainerRef}>

        {/* Sidebar Component */}
        <Sidebar
          ref={sidebarRef} // Pass ref.
          style={{ width: `${sidebarWidth}px` }} // Pass dynamic width.
          structure={folderStructure} // Pass folder data.
          onSelectTopic={handleSelectTopic} // Pass topic click handler.
          selectedItem={selectedItem} // Pass current selection.
          onResizeMouseDown={handleMouseDown} // Pass the function that STARTS resizing.
          onOpenUploadModal={openModal} // Pass the function to open the modal.
        />

        {/* Content Display Component */}
        <ContentDisplay
          content={currentContent} // Pass content to show.
          selectedItem={selectedItem} // Pass selected item info.
          isLoading={isLoading} // Pass loading state.
          error={error} // Pass error message.
        />

      </div> {/* End app-container */}


      {/* --- Theme Toggle Button --- Always visible! */}
      <button
        onClick={toggleTheme} // Toggle theme on click.
        className="theme-toggle-button" // CSS class for styling.
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} // Accessibility text.
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} // Tooltip text.
      >
        {/* Show sun or moon emoji based on current theme! */}
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
  ); // End return statement
} // End App component function

// Export the App component! Make it the star of the show!
export default App; // That's really all for this file now!
