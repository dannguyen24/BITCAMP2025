// src/components/Sidebar.jsx

import React from 'react'; // Need React, maybe hooks later if we add collapse? forwardRef is key!
// No FileUpload import needed here anymore!

// Sidebar component, wrapped in forwardRef to accept 'ref' and 'style'.
// Also receives the 3-level 'structure', the 3-level 'selectedItem',
// and the 3-level 'onSelectTopic' callback! Plus modal/resize handlers.
const Sidebar = React.forwardRef(({ structure, onSelectTopic, selectedItem, style, onResizeMouseDown, onOpenUploadModal }, ref) => {

  // Get the top-level keys (Subjects) from the structure.
  const subjects = Object.keys(structure || {}); // Use || {} for safety if structure is null/undefined initially

  return (
    // Main sidebar element. Apply dynamic style (width) and the ref. Needs position: relative from CSS.
    <aside className="sidebar" style={style} ref={ref}>

      {/* Invisible handle for resizing - still needs to be here! */}
      <div className="sidebar-border-handle" onMouseDown={onResizeMouseDown} />

      {/* Title Area with Upload Button */}
      <div className="sidebar-title-area">
        <h2>My Lectures! ✨</h2>
        <button onClick={onOpenUploadModal} className="upload-modal-button" title="Upload New Lecture">
          + Upload
        </button>
      </div>

      {/* The scrollable area for the folder structure */}
      <div className="sidebar-content-scrollable">
        {/* Show message if structure is empty */}
        {subjects.length === 0 && (
           <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
               Loading structure or empty... Use Upload! 🤔
            </p>
        )}

        {/* --- LEVEL 1: Subjects --- */}
        <ul className="subject-list">
          {subjects.map((subject) => (
            <li key={subject} className="subject-item">
              {/* Subject Header (Not clickable for now) */}
              <div className="subject-header">{subject}</div>

              {/* --- LEVEL 2: Classes --- Nested list for classes within this subject! */}
              <ul className="class-list"> {/* Added class for potential styling */}
                {Object.keys(structure[subject] || {}).map((className) => ( // Use className alias
                  <li key={className} className="class-item"> {/* Added class */}
                    {/* Class Header (Not clickable for now) */}
                    <div className="class-header">{className}</div> {/* Added class */}

                    {/* --- LEVEL 3: Topics --- Nested list for topics within this class! */}
                    <ul className="topic-list"> {/* Existing class */}
                      {Object.keys(structure[subject][className] || {}).map((topic) => (
                        // Each topic IS clickable!
                        <li
                          key={topic}
                          // Check selection against all 3 levels now!
                          className={`topic-item ${
                            selectedItem?.subject === subject &&
                            selectedItem?.class === className && // Check class name
                            selectedItem?.topic === topic
                              ? 'selected' // Add 'selected' class if all match!
                              : ''
                          }`}
                          // *** MODIFIED onClick ***: Pass all 3 identifiers!
                          onClick={() => onSelectTopic(subject, className, topic)}
                        >
                          {topic} {/* Display the topic name */}
                        </li>
                      ))}
                    </ul> {/* End Topic List */}
                  </li> // End Class Item
                ))}
              </ul> {/* End Class List */}
            </li> // End Subject Item
          ))}
        </ul> {/* End Subject List */}
      </div> {/* End scrollable area */}

      {/* Upload area at the bottom is GONE! Moved to modal! */}

    </aside> // End sidebar element
  ); // End return
}); // End forwardRef

// Export the modified Sidebar!
export default Sidebar;