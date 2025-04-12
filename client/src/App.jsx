// Imports first! React, hooks (useState, useEffect, useCallback, useRef), our components, and styles! The usual gang!
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar'; // Our trusty Sidebar component!
import ContentDisplay from './components/ContentDisplay'; // And the ContentDisplay!
import './App.css'; // Gotta have those pretty purple styles! 💅

// === The Grand Central Station: App Component ===
// This component holds the state, talks to the backend, and tells other components what to do! 
function App() {
  // --- State & Refs for our SUPER FANCY Resizable Sidebar ---
  // How wide is it? Let's start at 280 pixels...
  const [sidebarWidth, setSidebarWidth] = useState(280);
  // Are we *currently* dragging the border to resize? True/False flag! 
  const [isResizing, setIsResizing] = useState(false);
  // Refs! Like little bookmarks for our HTML elements! Maybe useful later? Idk! ¯\_(ツ)_/¯
  const appContainerRef = useRef(null); // Bookmark for the whole app box
  const sidebarRef = useRef(null); // Bookmark for the sidebar itself
  // --- End Sidebar Stuff ---

  // --- Core Application State --- The important data! ---
  // The folders! Subjects and Topics! Starts empty until backend gives it to us!
  const [folderStructure, setFolderStructure] = useState({});
  // Which lecture topic is currently selected? Starts as nothing!
  const [selectedItem, setSelectedItem] = useState(null);
  // What's the transcript/resource content for the selected lecture? Also starts empty!
  const [currentContent, setCurrentContent] = useState(null);
  // Is the app busy fetching stuff from the backend? Gotta let the user know!
  const [isLoading, setIsLoading] = useState(false);
  // Did something explode?! 💥 Store the error message here! Hopefully stays null!
  const [error, setError] = useState(null);
  // --- End Core State ---


  // --- MOUSE EVENT HANDLERS for Resizing --- Where the drag magic happens! ---
  // These functions still live here in App.jsx because App controls the width state!

  // This runs NON-STOP while the mouse is moving IF we are resizing! Calculates width!
  const handleMouseMove = useCallback((e) => {
    // Quick check: Are we even supposed to be resizing right now? If not, ignore!
    if (!isResizing) return; // Phew

    // Okay, where's the mouse horizontally? That's the potential new width!
    let newWidth = e.clientX;

    // Safety first! Let's set min/max width limits! No crazy sizes!
    const minWidth = 200; // Smallest allowed!
    const maxWidth = 600; // Biggest allowed! (You can change these!)

    // Apply the limits! Keep it reasonable!
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;

    // Update the sidebar width state! React takes care of the rest! 
    setSidebarWidth(newWidth);
  }, [isResizing]); // This function cares about the 'isResizing' state!

  // This runs when the user lets go of the mouse button ANYWHERE! Stops the resize!
  const handleMouseUp = useCallback(() => {
    // Again, only do stuff if we were *in the middle* of resizing!
    if (isResizing) {
      console.log("Mouse Up! Resize complete!");
      // Okay, resizing is OVER! Update the state!
      setIsResizing(false);
      // *** CRITICAL CLEANUP! *** Remove the listeners from the window! No memory leaks please!
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Reset the cursor and allow text selection again
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  }, [isResizing, handleMouseMove]); // Depends on 'isResizing' state and the 'handleMouseMove' function

  // This function is the STARTER PISTOL! 🔫 It runs when the mouse button goes DOWN...
  // ... on the special invisible handle *inside* the Sidebar component!
  // We pass this whole function down to the Sidebar as a prop
  const handleMouseDown = useCallback((e) => {
    // Sidebar called this function! Means user clicked the border handle! Let's resize!
    console.log("Mouse Down detected on sidebar handle! Starting drag sequence...");
    // Stop the browser from doing default weird stuff (like text selection)
    e.preventDefault();
    // Update the state: YES, we are resizing NOW!
    setIsResizing(true);
    // Add listeners to the *whole window* to catch movements and the final mouse release!
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    // Make the cursor look right (col-resize) and stop text selection while dragging! Nicer UX!
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [handleMouseMove, handleMouseUp]); // Depends on the move/up handlers we defined above


  // --- Data Fetching & Other Logic --- Talking to the backend & handling clicks! ---

  // Function to fetch the folder structure (subjects/topics)
  // Also used as the 'onUploadSuccess' callback! Very reusable! 👍
  const fetchStructure = useCallback(async () => {
    console.log("Fetching/Refreshing sidebar structure...");
    setIsLoading(true); // Show loading state!
    setError(null); // Clear previous errors!
    try {
      // --- API Call #1: Get Structure! --- Check this URL! ---
      const response = await fetch('/api/structure'); // Or 'http://localhost:5000/api/structure'...
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`); // Error? Bail out!
      const data = await response.json(); // Get the JSON data!
      console.log("Got structure data:", data);
      setFolderStructure(data || {}); // Update state! Use empty object if data is null/weird!
    } catch (err) {
      console.error("Failed to fetch structure!", err); // Log the error!
      setError(`Couldn't load lecture structure: ${err.message}.`); // Tell the user!
      setFolderStructure({}); // Reset state on error!
    } finally {
      setIsLoading(false); // Done loading (success or fail)!
    }
  }, []); // Empty dependency array [] means this function's identity is stable!

  // useEffect: Runs once when the component first loads! Fetches initial folders!
  useEffect(() => {
    console.log("App component first loaded! Getting initial structure...");
    fetchStructure();
  }, [fetchStructure]); // Run it once fetchStructure is defined

  // useEffect: Runs whenever 'selectedItem' changes! Fetches content for the new selection!
  useEffect(() => {
    // If nothing is selected, just clear the content area!
    if (!selectedItem) {
      setCurrentContent(null);
      return; // Stop here!
    }

    // Define the async function to fetch content for the selected item!
    const fetchContent = async () => {
      console.log("Selection changed to:", selectedItem, "! Fetching its content...");
      setIsLoading(true); // Loading again!
      setError(null); // Clear errors!
      setCurrentContent(null); // Clear old content immediately!
      try {
        const { subject, topic } = selectedItem; // Get subject/topic from state
        // --- API Call #2: Get Content! --- Check URL & params! ---
        const response = await fetch(`/api/content?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`); // Error? Bail!
        const data = await response.json(); // Get the juicy content data!
        console.log("Got content data:", data);
        setCurrentContent(data); // Update state with the new content!
      } catch (err) {
        console.error("Failed to fetch content!", err); // Log error!
        setError(`Couldn't load content for ${selectedItem.topic}: ${err.message}`); // Tell user!
        setCurrentContent(null); // Clear content on error!
      } finally {
        setIsLoading(false); // Done loading content!
      }
    };

    fetchContent(); // Call the function!
  }, [selectedItem]); // Dependency: Re-run whenever selectedItem changes!


  // --- Event Handler for Topic Selection --- Handles clicks in the Sidebar! ---

  // This function is passed down to Sidebar and called when a topic item is clicked!
  const handleSelectTopic = (subject, topic) => {
    console.log(`Topic clicked: Subject='${subject}', Topic='${topic}'`);
    // Only update state if it's a DIFFERENT topic than the currently selected one! Avoid useless re-renders!
    if (selectedItem?.subject !== subject || selectedItem?.topic !== topic) {
      setSelectedItem({ subject, topic }); // Update the state! Triggers the fetchContent effect!
    } else {
      console.log("...but it's the same topic. Zzzzz..."); // User clicked the same thing... whatever!
    }
  };


  // --- THE RENDER METHOD! --- What actually gets put on the screen! ---
  return (
    // The main container div! Give it the ref and the CSS class!
    <div className="app-container" ref={appContainerRef}>

      {/* Render our Sidebar component! Pass it all the props it needs! */}
      <Sidebar
        ref={sidebarRef} // Pass the ref!
        style={{ width: `${sidebarWidth}px` }} // Pass the dynamic width style!
        structure={folderStructure} // Pass the folder data!
        onSelectTopic={handleSelectTopic} // Pass the click handler!
        selectedItem={selectedItem} // Pass the current selection!
        onUploadSuccess={fetchStructure} // Pass the refresh callback!
        // --- Here's the new prop! Pass the function that STARTS the resize drag! ---
        onResizeMouseDown={handleMouseDown}
      />

      {/* !!! --- The old separate resizer div is GONE! Deleted! Vanished! Poof! --- !!! */}

      {/* Render our ContentDisplay component! It just shows stuff! */}
      <ContentDisplay
        content={currentContent} // Pass the content to display!
        selectedItem={selectedItem} // Pass the selected item info!
        isLoading={isLoading} // Pass the loading state!
        error={error} // Pass any error messages!
      />

    </div> // End of the main app container div
  ); // End of the return statement
} // End of the App function component

// Export App! Make it available for index.js/main.jsx to render! THE END! (for this file!)
export default App; // Tada! 🎉
