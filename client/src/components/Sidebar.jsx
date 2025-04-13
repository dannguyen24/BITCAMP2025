// Need useState and useCallback
import React, { useState, useCallback } from 'react';
// Import an icon if you have one, otherwise use text/emoji
// import { FaTrashAlt } from 'react-icons/fa'; // Example using react-icons

// Sidebar component, wrapped in forwardRef.
// Receives delete handlers: onDeleteSubject, onDeleteClass, onDeleteTopic
const Sidebar = React.forwardRef(({ structure, onSelectTopic, selectedItem, style, onResizeMouseDown, onOpenUploadModal, onDeleteSubject, onDeleteClass, onDeleteTopic }, ref) => {

  // State for collapsible sections (Unchanged)
  const [openSubjects, setOpenSubjects] = useState(new Set());
  const [openClasses, setOpenClasses] = useState(new Set());

  // --- NEW State: Track which item is marked for deletion ---
  // Stores an object like { type: 'subject'/'class'/'topic', id: 'uniqueIdentifier' } or null
  const [markedForDelete, setMarkedForDelete] = useState(null);
  // --- End New State ---

  // Toggle Functions (Unchanged)
  const toggleSubject = useCallback((subjectName) => { setOpenSubjects(prev => { const n=new Set(prev); n.has(subjectName)?n.delete(subjectName):n.add(subjectName); return n; }); }, []);
  const toggleClass = useCallback((subjectName, className) => { const key=`${subjectName}/${className}`; setOpenClasses(prev => { const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; }); }, []);

  // --- NEW: Double-Click Handler to Mark Item ---
  const handleDoubleClickMark = useCallback((e, type, id) => {
    e.stopPropagation(); // Prevent triggering single clicks on parents
    e.preventDefault(); // Prevent default double-click text selection
    const newItem = { type, id };
    console.log("Double-click marking:", newItem);
    // Mark the new item (or unmark if double-clicking the same one again)
    setMarkedForDelete(prevMarked => {
        // If double-clicking the already marked item, unmark it
        if (prevMarked?.type === type && prevMarked?.id === id) {
            return null;
        }
        // Otherwise, mark the new item
        return newItem;
    });
  }, []); // Stable function

  // --- NEW: Handler to Unmark on Single Click (if not clicking delete button) ---
  const handleUnmarkOrToggle = useCallback((e, type, id, toggleFunction) => {
      // Check if the click was on the delete button itself
      // We use closest() because the click target might be the icon inside the button
      if (e.target.closest('.delete-button')) {
          console.log("Click on or inside delete button ignored by unmark/toggle.");
          return; // Don't do anything if the delete button was clicked
      }

      const currentMarkedId = markedForDelete?.id;
      const clickedItemId = id;

      // If something IS marked and the user clicked the MARKED item (not the delete button)
      if (markedForDelete && currentMarkedId === clickedItemId) {
          console.log("Single click on marked item, unmarking:", clickedItemId);
          e.stopPropagation(); // Prevent toggle if unmarking
          setMarkedForDelete(null); // Unmark it
      } else if (toggleFunction) {
           // Otherwise, if nothing was marked, or clicking a DIFFERENT item,
           // perform the regular toggle action (if a toggle function was provided)
           console.log("Performing standard toggle/select action.");
           setMarkedForDelete(null); // Ensure any other item is unmarked
           toggleFunction(); // Call the original toggle/select function
      } else {
           // If it's a topic item (no toggleFunction), just unmark others
           setMarkedForDelete(null);
      }

  }, [markedForDelete]); // Depends on the markedForDelete state

  // Generic Delete Click Handler (stops propagation, calls parent delete)
  const handleDeleteClick = (e, deleteFunction, ...args) => {
      e.stopPropagation(); // Prevent click from triggering parent actions!
      console.log("Delete button clicked, calling handler with args:", args);
      setMarkedForDelete(null); // Unmark the item after initiating delete
      deleteFunction(...args); // Call the actual delete handler passed from App.jsx
  };

  const subjects = Object.keys(structure || {});

  // Helper to check if an item is marked
  const isMarked = (type, id) => markedForDelete?.type === type && markedForDelete?.id === id;

  return (
    <aside className="sidebar" style={style} ref={ref}>
      <div className="sidebar-border-handle" onMouseDown={onResizeMouseDown} />

      <div className="sidebar-title-area">
        <h2>My Lectures! ✨</h2>
        <button onClick={onOpenUploadModal} className="upload-modal-button" title="Upload New Lecture">
          + Upload
        </button>
      </div>

      <div className="sidebar-content-scrollable">
        {subjects.length === 0 && ( <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading or empty...</p> )}

        <ul className="subject-list">
          {subjects.map((subject) => {
            const isSubjectOpen = openSubjects.has(subject);
            const subjectId = subject; // Use subject name as ID
            const subjectIsMarked = isMarked('subject', subjectId);
            return (
              <li key={subjectId} className="subject-item">
                <div
                  className={`clickable-header subject-header-container ${subjectIsMarked ? 'marked-container' : ''}`}
                  // Single click now handles unmarking OR toggling
                  onClick={(e) => handleUnmarkOrToggle(e, 'subject', subjectId, () => toggleSubject(subject))}
                  role="button" aria-expanded={isSubjectOpen} tabIndex={0}
                >
                  <div
                    className="header-content"
                    // Double click on the text/arrow area marks it
                    onDoubleClick={(e) => handleDoubleClickMark(e, 'subject', subjectId)}
                  >
                    <span className={`sidebar-arrow ${isSubjectOpen ? 'expanded' : ''}`} aria-hidden="true">▶</span>
                    <span className={`header-text ${subjectIsMarked ? 'marked-for-delete' : ''}`}>{subject}</span>
                  </div>
                  {/* Render delete button ONLY if this subject is marked */}
                  {subjectIsMarked && (
                    <button
                        className="delete-button sidebar-delete-button"
                        title={`Delete Subject: ${subject}`}
                        onClick={(e) => handleDeleteClick(e, onDeleteSubject, subject)}
                        aria-label={`Confirm delete Subject ${subject}`}
                    > 🗑️ </button>
                  )}
                </div>

                {/* LEVEL 2: Classes */}
                {isSubjectOpen && (
                  <ul className="class-list">
                    {Object.keys(structure[subject] || {}).map((className) => {
                      const classKey = `${subject}/${className}`; // Composite key as ID
                      const isClassOpen = openClasses.has(classKey);
                      const classIsMarked = isMarked('class', classKey);
                      return (
                        <li key={classKey} className="class-item">
                          <div
                            className={`clickable-header class-header-container ${classIsMarked ? 'marked-container' : ''}`}
                            onClick={(e) => handleUnmarkOrToggle(e, 'class', classKey, () => toggleClass(subject, className))}
                            role="button" aria-expanded={isClassOpen} tabIndex={0}
                           >
                             <div
                                className="header-content"
                                onDoubleClick={(e) => handleDoubleClickMark(e, 'class', classKey)}
                              >
                                <span className={`sidebar-arrow ${isClassOpen ? 'expanded' : ''}`} aria-hidden="true">▶</span>
                                <span className={`header-text ${classIsMarked ? 'marked-for-delete' : ''}`}>{className}</span>
                              </div>
                             {/* Render delete button ONLY if this class is marked */}
                             {classIsMarked && (
                               <button
                                  className="delete-button sidebar-delete-button"
                                  title={`Delete Class: ${className}`}
                                  onClick={(e) => handleDeleteClick(e, onDeleteClass, subject, className)}
                                  aria-label={`Confirm delete Class ${className}`}
                               > 🗑️ </button>
                              )}
                          </div>

                          {/* LEVEL 3: Topics */}
                          {isClassOpen && (
                            <ul className="topic-list">
                              {Object.keys(structure[subject][className] || {}).map((topic) => {
                                const topicKey = `${subject}/${className}/${topic}`; // Full path as ID
                                const topicIsMarked = isMarked('topic', topicKey);
                                const isSelected = selectedItem?.subject === subject && selectedItem?.class === className && selectedItem?.topic === topic;
                                return (
                                <li
                                  key={topicKey}
                                  className={`topic-item-container ${isSelected ? 'selected' : ''} ${topicIsMarked ? 'marked-container' : ''}`}
                                  // Single click on container unmarks ONLY IF it was marked (otherwise select happens on inner span)
                                  onClick={(e) => handleUnmarkOrToggle(e, 'topic', topicKey, null)} // No toggle func for topic item itself
                                >
                                   {/* Topic text span - handles selection and double click */}
                                   <span
                                      className={`topic-item ${topicIsMarked ? 'marked-for-delete' : ''}`}
                                      onClick={(e) => {
                                          // If marked, don't trigger select on single click, let container handle unmark
                                          if (topicIsMarked) {
                                              e.stopPropagation();
                                              return;
                                          }
                                          // Otherwise, perform selection AND unmark anything else
                                          setMarkedForDelete(null);
                                          onSelectTopic(subject, className, topic);
                                      }}
                                      onDoubleClick={(e) => handleDoubleClickMark(e, 'topic', topicKey)}
                                      role="button" tabIndex={0}
                                    >
                                        {topic}
                                    </span>
                                    {/* Render delete button ONLY if this topic is marked */}
                                    {topicIsMarked && (
                                        <button
                                            className="delete-button sidebar-delete-button topic-delete-button"
                                            title={`Delete Topic: ${topic}`}
                                            onClick={(e) => handleDeleteClick(e, onDeleteTopic, subject, className, topic)}
                                            aria-label={`Confirm delete Topic ${topic}`}
                                        > 🗑️ </button>
                                    )}
                                </li>
                                );
                              })}
                            </ul> // End Topic List
                          )} {/* End conditional Topics */}
                        </li> // End Class Item
                       );
                    })}
                  </ul> // End Class List
                )} {/* End conditional Classes */}
              </li> // End Subject Item
             );
          })}
        </ul> {/* End Subject List */}
      </div> {/* End scrollable area */}
    </aside> // End sidebar element
  ); // End return
}); // End forwardRef

export default Sidebar;