// src/App.jsx

// Imports! React hooks (useState, useEffect, useCallback, useRef), flushSync for our resize fix, components, and styles!
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom'; // Needed for the resize consistency fix.
import Sidebar from './components/Sidebar'; // Our trusty Sidebar component.
import ContentDisplay from './components/ContentDisplay'; // Where the stuff shows up.
import UploadModal from './components/UploadModal'; // The popup modal for uploads.
import './App.css'; // Styles, including dark mode. Very important.

// --- !!! MOCK DATA FOR UI TESTING (Updated Structure w/ structuredResources & More Folders) !!! ---
const mockStructureData = {
  "Computer Science": {
    "CS 101 - Intro": { "Course Overview": {}, "Basic Syntax": {}, "Variables & Types": {}, "Control Flow": {}, "Functions": {} },
    "CS 202 - Data Structures": { "Arrays": {}, "Linked Lists": {}, "Stacks & Queues": {}, "Hash Tables": {}, "Trees": {}, "Graphs": {} },
    "CS 303 - Algorithms": { "Big O Notation": {}, "Sorting Algorithms": {}, "Searching Algorithms": {}, "Dynamic Programming": {}, "Greedy Algorithms": {} },
    "CS 404 - Web Dev": { "HTML & CSS": {}, "JavaScript Basics": {}, "React Intro": {}, "Node.js & Express": {} }
  },
  "History": {
    "HIST 110 - US History": { "Colonial Period": {}, "Revolutionary War": {}, "Early Republic": {}, "Civil War": {}, "Reconstruction": {}, "Industrial Age": {} },
    "HIST 320 - WWII": { "Causes": {}, "Rise of Fascism": {}, "European Theater": {}, "Pacific Theater": {}, "The Holocaust": {}, "Aftermath": {} },
    "HIST 250 - Ancient Civ": { "Mesopotamia": {}, "Ancient Egypt": {}, "Ancient Greece": {}, "Roman Republic": {}, "Roman Empire": {} }
  },
  "Biology": {
    "BIO 101 - General Bio": { "Scientific Method": {}, "Cell Structure": {}, "Macromolecules": {}, "Metabolism Intro": {}, "Mitochondria": {}, "Photosynthesis": {}, "Cellular Respiration": {} },
    "BIO 220 - Genetics": { "Mendelian Genetics": {}, "DNA Structure": {}, "Replication & Transcription": {}, "Translation": {}, "Population Genetics": {} },
    "BIO 330 - Ecology": { "Ecosystems": {}, "Biomes": {}, "Population Dynamics": {}, "Community Interactions": {}, "Conservation Biology": {} }
  },
  "Physics": { "PHYS 101 - Mechanics": { "Kinematics": {}, "Newton's Laws": {}, "Work & Energy": {}, "Momentum": {}, "Rotational Motion": {} }, "PHYS 202 - E&M": { "Electric Fields": {}, "Gauss's Law": {}, "Electric Potential": {}, "Capacitance": {}, "Circuits (DC)": {}, "Magnetic Fields": {} } },
   "Literature": { "LIT 100 - Intro to Lit": { "Poetry Analysis": {}, "Short Stories": {}, "The Novel": {}, "Drama": {} }, "LIT 340 - Shakespeare": { "Hamlet": {}, "Macbeth": {}, "Romeo & Juliet": {}, "Sonnets": {} } },
    "Economics": { "ECON 101 - Microeconomics": { "Supply and Demand": {}, "Elasticity": {}, "Market Structures": {}, "Consumer Theory": {} }, "ECON 102 - Macroeconomics": { "GDP & Inflation": {}, "Aggregate Demand/Supply": {}, "Monetary Policy": {}, "Fiscal Policy": {} } }
};

// Updated mock content data with the new 'structuredResources' field!
// Matches: Subject="Computer Science", Class="CS 202 - Data Structures", Topic="Linked Lists"
const mockContentData = [
  {
    _id: "mockNote1", // Added mock ID for delete testing
    uploadDate: "2024-03-10T10:00:00Z",
    topicsCovered: ["Singly Linked Lists", "Node Structure", "Head Pointer", "Traversal"],
    summary: "Introduced the fundamental concepts of singly linked lists, including node creation, head pointers, and basic list traversal.",
    structuredResources: [
      { "topic": "Singly Linked Lists", "googleLink": "https://www.geeksforgeeks.org/linked-list-set-1-introduction/", "youtubeLink": "https://www.youtube.com/watch?v=njTh_OvY_zo" },
      { "topic": "Node Structure", "googleLink": "https://en.wikipedia.org/wiki/Node_(computer_science)", "youtubeLink": "https://www.youtube.com/watch?v=3_w_mdPyDmY" },
      { "topic": "Head Pointer", "googleLink": null, "youtubeLink": "https://www.youtube.com/watch?v=FtlF4_XG5Ew" },
      { "topic": "Traversal", "googleLink": "https://www.programiz.com/dsa/linked-list-traversal", "youtubeLink": null }
    ],
    transcript: "Alright class, today we're moving on to a fundamental data structure: the linked list... (Imagine more transcript text here...)"
  },
  {
    _id: "mockNote2", // Added mock ID
    uploadDate: "2024-03-12T11:30:00Z",
    topicsCovered: ["Insertion (Head, Tail, Middle)", "Deletion"],
    summary: "Covered various insertion methods and how to handle node deletion.",
    structuredResources: [
       { "topic": "Insertion", "googleLink": "https://www.geeksforgeeks.org/linked-list-set-2-inserting-a-node/", "youtubeLink": "https://www.youtube.com/watch?v=SCDGNqOx4iA" },
       { "topic": "Deletion", "googleLink": "https://www.geeksforgeeks.org/linked-list-set-3-deleting-node/", "youtubeLink": "https://www.youtube.com/watch?v=HAN_N4IIw0Y" }
    ],
    transcript: "Okay, building on our previous lecture, let's talk about modifying..."
  }
];
// --- !!! END MOCK DATA !!! ---


// === App Component === Using Mock Data, with Delete Handlers Ready ===
function App() {
  // --- State Definitions (Theme, Modal, Resizing) ---
  const [theme, setTheme] = useState('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(isResizing);
  useEffect(() => { isResizingRef.current = isResizing; }, [isResizing]);
  const appContainerRef = useRef(null);
  const sidebarRef = useRef(null);

  // --- Core Application State --- Initialize with Mock Data! ---
  // *** Uses the expanded mockStructureData now! ***
  const [folderStructure, setFolderStructure] = useState(mockStructureData);
  const [selectedItem, setSelectedItem] = useState(null); // { subject, class, topic }
  // *** Content state expects an ARRAY of note objects ***
  const [currentContent, setCurrentContent] = useState(null); // Array or null
  const [isLoading, setIsLoading] = useState(false); // General loading
  const [isDeleting, setIsDeleting] = useState(false); // *** NEW: Specific loading state for deletes ***
  const [error, setError] = useState(null);
  // --- End Core State ---


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


  // --- Data Fetching & Topic Selection Logic --- *** USING MOCK DATA *** ---

  // Fetch folder structure function - Defined but not called initially. Used for refresh.
  const fetchStructure = useCallback(async (calledFrom = 'unknown') => {
    console.log(`Fetching/Refreshing structure... (MOCK DATA ACTIVE - Call from: ${calledFrom})`);
    setIsLoading(true); setError(null);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate tiny delay
    // In a real app, fetch here. In mock mode, maybe reset state if needed, or do nothing.
    // setFolderStructure(mockStructureData); // Example: Reset to original mock
    console.log("Structure 'refresh' complete (mock mode).");
    setIsLoading(false);
    }, []);

  // Initial fetch on mount - *** COMMENTED OUT *** to use mock data right away.
  useEffect(() => {
    console.log("App mounted. Using mock structure data. Skipping initial fetch.");
    // fetchStructure('initialMount'); // <-- BYPASSING fetch on initial load!
  }, []); // Empty deps still means runs once.

  // Fetch content effect - *** USES MOCK DATA *** based on selected item.
  useEffect(() => {
    console.log("Selection changed:", selectedItem);
    if (!selectedItem || !selectedItem.subject || !selectedItem.class || !selectedItem.topic) { setCurrentContent(null); return; }
    console.log("Checking mock data for selected item...");
    setIsLoading(true); setError(null);
    // Check if the selection matches our specific mock content key
    if ( selectedItem.subject === "Computer Science" && selectedItem.class === "CS 202 - Data Structures" && selectedItem.topic === "Linked Lists" ) {
      console.log("Setting mock content for Linked Lists.");
      setTimeout(() => { console.log("Setting currentContent STATE to:", mockContentData); setCurrentContent(mockContentData); setIsLoading(false); }, 300); // Simulate delay
    } else {
      console.log("No specific mock content found. Setting empty array.");
       setTimeout(() => { setCurrentContent([]); setIsLoading(false); }, 300); // Simulate delay
    }
  }, [selectedItem]); // Re-run when selectedItem changes!


  // Handle topic clicks from Sidebar - (Unchanged).
  const handleSelectTopic = useCallback((subject, className, topic) => { console.log(`Topic selected: ${subject}/${className}/${topic}`); const newItem={subject, class: className, topic}; if(selectedItem?.subject!==subject || selectedItem?.class !== className || selectedItem?.topic !== topic){setSelectedItem(newItem);} else { console.log("...same topic selected."); }}, [selectedItem]);


  // --- !!! DELETE HANDLERS (Mock Aware) !!! --- Structure is here, calls won't delete real data. ---

  // Generic Delete Function (Helper) - Skips API call in mock mode.
  const performDelete = async (url, itemDescription, successCallback) => {
    if (!window.confirm(`Are you sure you want to delete "${itemDescription}"? This action cannot be undone.`)) {
      console.log("Delete cancelled by user for:", itemDescription);
      return;
    }
    console.log(`MOCK DELETE: Would attempt DELETE on ${url} for "${itemDescription}"`);
    setIsDeleting(true); setError(null);
    // --- SIMULATE API CALL DELAY ---
    await new Promise(resolve => setTimeout(resolve, 500));
    // --- END SIMULATION ---
    // In real mode, check response here. In mock mode, assume success for UI testing.
    console.log(`MOCK DELETE: Successfully 'deleted': ${itemDescription}`);
    alert(`"${itemDescription}" deleted successfully (Mock Mode).`);
    if (successCallback) { successCallback(); } // Run refresh logic
    setIsDeleting(false);
    // --- Error handling omitted for mock mode simplicity ---
  };

  // Handler for deleting a specific note entry - Modifies mock content state.
  const handleDeleteNote = useCallback(async (noteId, noteIdentifier = 'this note') => {
    console.log(`MOCK DELETE: Requesting delete for note ID: ${noteId}`);
    if (!noteId) { console.error("handleDeleteNote called without noteId!"); return; }
    const url = `/api/notes/${noteId}`; // URL for real backend

    await performDelete(url, noteIdentifier, () => {
      // --- MOCK STATE UPDATE --- Remove the note from currentContent if it exists
      setCurrentContent(prevContent => {
          if (!prevContent) return null;
          const updatedContent = prevContent.filter(note => note._id !== noteId);
          console.log("MOCK DELETE: Updated currentContent state:", updatedContent);
          // If content becomes empty, show placeholder; otherwise show remaining notes.
          return updatedContent.length > 0 ? updatedContent : [];
      });
      // No need to refetch structure in mock mode unless simulating.
    });
  }, []); // No dependency on selectedItem needed for mock state update

  // Handler for deleting a topic folder - Modifies mock structure state.
  const handleDeleteTopic = useCallback(async (subject, className, topic) => {
    console.log(`MOCK DELETE: Requesting delete for topic: ${subject}/${className}/${topic}`);
    const url = `/api/topics?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}&topic=${encodeURIComponent(topic)}`;
    const description = `Topic: ${topic}`;

    await performDelete(url, description, () => {
      // --- MOCK STATE UPDATE --- Remove topic from folderStructure
      setFolderStructure(prevStructure => {
          const newStructure = JSON.parse(JSON.stringify(prevStructure)); // Deep copy
          if (newStructure[subject]?.[className]) {
              delete newStructure[subject][className][topic];
              // Optionally delete class/subject if they become empty
              if (Object.keys(newStructure[subject][className]).length === 0) {
                  delete newStructure[subject][className];
                  if (Object.keys(newStructure[subject]).length === 0) {
                      delete newStructure[subject];
                  }
              }
               console.log("MOCK DELETE: Updated folderStructure state:", newStructure);
              return newStructure;
          }
          return prevStructure; // No change if path didn't exist
      });
      // If the deleted topic was selected, clear selection & content.
      if (selectedItem?.subject === subject && selectedItem?.class === className && selectedItem?.topic === topic) {
        setSelectedItem(null);
        setCurrentContent(null);
      }
    });
  }, [selectedItem]); // Depend on selectedItem to clear it

  // Handler for deleting a class folder - Modifies mock structure state.
  const handleDeleteClass = useCallback(async (subject, className) => {
     console.log(`MOCK DELETE: Requesting delete for class: ${subject}/${className}`);
     const url = `/api/classes?subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(className)}`;
     const description = `Class: ${className}`;

     await performDelete(url, description, () => {
         // --- MOCK STATE UPDATE --- Remove class from folderStructure
         setFolderStructure(prevStructure => {
             const newStructure = JSON.parse(JSON.stringify(prevStructure)); // Deep copy
             if (newStructure[subject]) {
                 delete newStructure[subject][className];
                 if (Object.keys(newStructure[subject]).length === 0) {
                     delete newStructure[subject];
                 }
                 console.log("MOCK DELETE: Updated folderStructure state:", newStructure);
                 return newStructure;
             }
             return prevStructure;
         });
         // If the deleted class contained the selected topic, clear selection.
         if (selectedItem?.subject === subject && selectedItem?.class === className) {
            setSelectedItem(null);
            setCurrentContent(null);
         }
     });
  }, [selectedItem]);

  // Handler for deleting a subject folder - Modifies mock structure state.
  const handleDeleteSubject = useCallback(async (subject) => {
      console.log(`MOCK DELETE: Requesting delete for subject: ${subject}`);
      const url = `/api/subjects?subject=${encodeURIComponent(subject)}`;
      const description = `Subject: ${subject}`;

      await performDelete(url, description, () => {
          // --- MOCK STATE UPDATE --- Remove subject from folderStructure
          setFolderStructure(prevStructure => {
              const newStructure = JSON.parse(JSON.stringify(prevStructure)); // Deep copy
              delete newStructure[subject];
              console.log("MOCK DELETE: Updated folderStructure state:", newStructure);
              return newStructure;
          });
         // If the deleted subject contained the selected item, clear selection.
          if (selectedItem?.subject === subject) {
              setSelectedItem(null);
              setCurrentContent(null);
          }
      });
  }, [selectedItem]);
  // --- End Delete Handlers ---


  // --- THE RENDERED JSX --- What the user actually sees! ---
  return (
    <>
      {/* Deleting Overlay */}
      {isDeleting && <div className="delete-overlay">Deleting... Please Wait...</div>}

      {/* Main app layout container */}
      <div className={`app-container ${isDeleting ? 'deleting' : ''}`} ref={appContainerRef}>

        {/* Sidebar Component - Pass mock structure and delete handlers */}
        <Sidebar
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          structure={folderStructure}
          onSelectTopic={handleSelectTopic}
          selectedItem={selectedItem}
          onResizeMouseDown={handleMouseDown}
          onOpenUploadModal={openModal}
          onDeleteSubject={handleDeleteSubject} // Pass delete handler
          onDeleteClass={handleDeleteClass}   // Pass delete handler
          onDeleteTopic={handleDeleteTopic}   // Pass delete handler
        />

        {/* Content Display Component - Pass mock content and delete handler */}
        <ContentDisplay
          content={currentContent}
          selectedItem={selectedItem}
          isLoading={isLoading && !isDeleting} // Adjust loading display
          error={error}
          onDeleteNote={handleDeleteNote} // Pass delete handler
        />

      </div> {/* End app-container */}


      {/* Theme Toggle Button */}
      <button onClick={toggleTheme} className="theme-toggle-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Upload Modal - onUploadSuccess calls the mock-aware fetchStructure */}
      <UploadModal isOpen={isModalOpen} onClose={closeModal} onUploadSuccess={() => fetchStructure('afterUpload')} />

    </> // End React Fragment
  ); // End return
} // End App component

// Export App!
export default App;
