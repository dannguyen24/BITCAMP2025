// src/components/ContentDisplay.jsx

import React, { useState } from 'react'; // Need useState for collapsible sections!

// --- Sub-Component for Collapsible Section --- Helper! ---
// This makes managing the collapsed state easier for each transcript.
function CollapsibleSection({ title, children, initiallyCollapsed = true }) {
  // State within THIS component to track if it's collapsed!
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);

  // Function to toggle the collapsed state
  const toggleCollapse = () => {
    setIsCollapsed(prevState => !prevState);
  };

  return (
    <div className="collapsible-section">
      {/* Clickable header to toggle */}
      <button
        className="collapsible-header"
        onClick={toggleCollapse}
        aria-expanded={!isCollapsed} // For accessibility!
      >
        {/* Show an arrow indicating state */}
        <span className={`collapse-arrow ${isCollapsed ? 'collapsed' : ''}`}>
          ▶ {/* Right-pointing triangle when collapsed */}
        </span>
        {title}
      </button>
      {/* The actual content - only render if NOT collapsed (or use CSS to hide) */}
      {!isCollapsed && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}
// --- End Collapsible Section Component ---


// --- Main Content Display Component --- Renders the array of notes! ---
function ContentDisplay({ content, selectedItem, isLoading, error }) {

  // --- Loading State ---
  if (isLoading) {
    return <div className="loading">Loading content... hang tight! ⏳</div>;
  }

  // --- Error State ---
  if (error) {
    return <div className="error">😱 Oh no! Error loading content: {error}</div>;
  }

  // --- Placeholder State --- No item selected yet!
  if (!selectedItem) {
    return <div className="placeholder">👈 Select a topic from the sidebar to view notes!</div>;
  }

  // --- Placeholder State --- Item selected, but no content found (empty array or null)
  // Check if content is an array and if it's empty.
  if (!content || !Array.isArray(content) || content.length === 0) {
    return (
        <div className="placeholder">
            🤔 No notes found for "{selectedItem.subject} / {selectedItem.class} / {selectedItem.topic}".
            Maybe upload some?
        </div>
    );
  }

  // --- SUCCESS! We have an array of notes to display! ---
  return (
    // Main content display area
    <main className="content-display">
      {/* Map over the array of note objects received in the 'content' prop */}
      {content.map((note, index) => (
        // Use React.Fragment to group elements for each note without adding extra divs to the DOM
        // Use the note's unique identifier if available (e.g., note.id), otherwise use index (less ideal but okay for now)
        <React.Fragment key={note.uploadDate || index}> {/* Assuming uploadDate might be unique enough for demo */}

          {/* --- Individual Note Card/Section --- */}
          <div className="content-section note-entry"> {/* Added 'note-entry' class */}

            {/* 1. Upload Date */}
            {note.uploadDate && (
              <p className="note-date">
                <em>Notes from: {new Date(note.uploadDate).toLocaleDateString()}</em> {/* Format the date nicely */}
              </p>
            )}

            {/* 2. Topics Covered Section */}
            {note.topicsCovered && (
              <div className="note-subsection">
                <h4>Topics Covered:</h4>
                {/* Check if it's an array or just a string */}
                {Array.isArray(note.topicsCovered) ? (
                  <ul>{note.topicsCovered.map((t, i) => <li key={i}>{t}</li>)}</ul>
                ) : (
                  <p>{note.topicsCovered}</p>
                )}
              </div>
            )}

            {/* 3. Summary Section */}
            {note.summary && (
              <div className="note-subsection">
                <h4>Summary:</h4>
                <p>{note.summary}</p>
              </div>
            )}

             {/* 4. Resources Section */}
            {note.resources && (
              <div className="note-subsection">
                <h4>Resources:</h4>
                {/* Use pre-wrap to preserve formatting if resources is a string with newlines */}
                <div className="resources-area">
                    {note.resources}
                </div>
              </div>
            )}

            {/* 5. Collapsible Transcript Section */}
            {note.transcript && (
               <div className="note-subsection">
                    {/* Use our new CollapsibleSection component! Start collapsed! */}
                    <CollapsibleSection title="Transcript" initiallyCollapsed={true}>
                        <div className="transcript-area">
                            {note.transcript}
                        </div>
                    </CollapsibleSection>
               </div>
            )}

          </div> {/* End note-entry content-section */}


          {/* --- Divider Line --- */}
          {/* Add a divider line IF this is NOT the last note in the array */}
          {index < content.length - 1 && (
            <hr className="note-divider" />
          )}

        </React.Fragment> // End loop fragment
      ))} {/* End map over content array */}
    </main> // End content-display main
  ); // End return
} // End ContentDisplay component

// Export it! Make it available!
export default ContentDisplay;