import React, { useState, useCallback } from 'react'; // Import useState and useCallback!
// No FileUpload needed here anymore.

// Sidebar component, wrapped in forwardRef.
// Receives props including the NEW onOpenUploadModal callback.
const Sidebar = React.forwardRef(({ structure, onSelectTopic, selectedItem, style, onResizeMouseDown, onOpenUploadModal }, ref) => {

  // === NEW State for Collapsible Sections ===
  // Keep track of which subjects are open. Using a Set for easy add/delete.
  const [openSubjects, setOpenSubjects] = useState(new Set());
  // Keep track of which classes are open. Use a composite key "SubjectName/ClassName" for uniqueness.
  const [openClasses, setOpenClasses] = useState(new Set());
  // === End New State ===

  // --- Toggle Functions ---
  // useCallback ensures these functions don't get recreated unnecessarily on re-renders.

  // Function to toggle a subject's open/closed state.
  const toggleSubject = useCallback((subjectName) => {
    console.log(`Toggling subject: ${subjectName}`);
    setOpenSubjects(prevOpenSubjects => {
      const newSet = new Set(prevOpenSubjects); // Create a new Set based on previous state
      if (newSet.has(subjectName)) {
        newSet.delete(subjectName); // If it was open, close it (remove from set)
      } else {
        newSet.add(subjectName); // If it was closed, open it (add to set)
      }
      return newSet; // Return the new set to update state
    });
  }, []); // Empty dependency array - this function's logic never changes

  // Function to toggle a class's open/closed state.
  const toggleClass = useCallback((subjectName, className) => {
    const classKey = `${subjectName}/${className}`; // Create the unique composite key
    console.log(`Toggling class: ${classKey}`);
    setOpenClasses(prevOpenClasses => {
      const newSet = new Set(prevOpenClasses); // Create new Set
      if (newSet.has(classKey)) {
        newSet.delete(classKey); // Close it
      } else {
        newSet.add(classKey); // Open it
      }
      return newSet; // Update state
    });
  }, []); // Empty dependency array - stable function identity

  // --- End Toggle Functions ---


  // Get the top-level keys (Subjects) from the structure.
  const subjects = Object.keys(structure || {}); // Use || {} for safety

  // The JSX for the sidebar.
  return (
    // Main sidebar element. Apply dynamic style (width) and the ref.
    <aside className="sidebar" style={style} ref={ref}>

      {/* Invisible handle for resizing - still needs to be here! */}
      <div className="sidebar-border-handle" onMouseDown={onResizeMouseDown} />

      {/* Title Area with Upload Button (Unchanged) */}
      <div className="sidebar-title-area">
        <h2>My Lectures! ✨</h2>
        <button onClick={onOpenUploadModal} className="upload-modal-button" title="Upload New Lecture">
          + Upload
        </button>
      </div>

      {/* The scrollable area for the folder structure */}
      <div className="sidebar-content-scrollable">
        {subjects.length === 0 && (
           <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading or empty...</p>
        )}

        {/* --- LEVEL 1: Subjects --- */}
        <ul className="subject-list">
          {subjects.map((subject) => {
            // Check if the current subject is open based on state
            const isSubjectOpen = openSubjects.has(subject);
            return (
              <li key={subject} className="subject-item">
                {/* Subject Header - Now CLICKABLE! */}
                <div
                  className="subject-header clickable-header" // Added clickable class
                  onClick={() => toggleSubject(subject)} // Call toggle function on click
                  role="button" // Indicate it's interactive
                  aria-expanded={isSubjectOpen} // Accessibility state
                  tabIndex={0} // Make it keyboard focusable
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSubject(subject)} // Allow toggle with Enter/Space
                >
                  {/* Arrow Indicator! Rotates based on state */}
                  <span className={`sidebar-arrow ${isSubjectOpen ? 'expanded' : ''}`} aria-hidden="true">▶</span>
                  {subject}
                </div>

                {/* --- LEVEL 2: Classes --- Render ONLY if subject is open! */}
                {isSubjectOpen && (
                  <ul className="class-list">
                    {Object.keys(structure[subject] || {}).map((className) => {
                      const classKey = `${subject}/${className}`; // Composite key
                      // Check if the current class is open based on state
                      const isClassOpen = openClasses.has(classKey);
                      return (
                        <li key={classKey} className="class-item">
                          {/* Class Header - Now CLICKABLE! */}
                          <div
                            className="class-header clickable-header" // Added clickable class
                            onClick={() => toggleClass(subject, className)} // Call toggle function
                            role="button"
                            aria-expanded={isClassOpen}
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleClass(subject, className)}
                          >
                            {/* Arrow Indicator! */}
                            <span className={`sidebar-arrow ${isClassOpen ? 'expanded' : ''}`} aria-hidden="true">▶</span>
                            {className}
                          </div>

                          {/* --- LEVEL 3: Topics --- Render ONLY if class is open! */}
                          {isClassOpen && (
                            <ul className="topic-list">
                              {Object.keys(structure[subject][className] || {}).map((topic) => (
                                // Topic items remain the same - not collapsible themselves
                                <li
                                  key={topic}
                                  className={`topic-item ${
                                    selectedItem?.subject === subject &&
                                    selectedItem?.class === className &&
                                    selectedItem?.topic === topic
                                      ? 'selected' : ''
                                  }`}
                                  // Call the original selection handler from App.jsx
                                  onClick={() => onSelectTopic(subject, className, topic)}
                                >
                                  {topic}
                                </li>
                              ))}
                            </ul> // End Topic List
                          )} {/* End conditional render for Topics */}
                        </li> // End Class Item
                       );
                    })}
                  </ul> // End Class List
                )} {/* End conditional render for Classes */}
              </li> // End Subject Item
             );
          })}
        </ul> {/* End Subject List */}
      </div> {/* End scrollable area */}

    </aside> // End sidebar element
  ); // End return
}); // End forwardRef

export default Sidebar;