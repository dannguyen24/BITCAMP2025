import React, { useState } from 'react'; // Need useState for collapsible sections!
// import { FaTrashAlt } from 'react-icons/fa'; // Example icon import if you use one

// --- Sub-Component for Collapsible Section --- Helper! ---
// This makes managing the collapsed state easier for each transcript. So tidy!
// Defaulting initiallyCollapsed to false to show transcript by default now.
function CollapsibleSection({ title, children, initiallyCollapsed = false }) { // <-- Default changed here!
  // State within THIS component to track if it's collapsed!
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);

  // Function to toggle the collapsed state. Simple flip!
  const toggleCollapse = () => {
    console.log(`Toggling section "${title}", new state will be: ${!isCollapsed}`); // Log the toggle
    setIsCollapsed(prevState => !prevState);
  };

  return (
    <div className="collapsible-section">
      {/* Clickable header to toggle. Aria-expanded helps screen readers! */}
      <button
        className="collapsible-header"
        onClick={toggleCollapse}
        aria-expanded={!isCollapsed} // True if open, False if collapsed
      >
        {/* Show an arrow indicating state. Rotates via CSS. */}
        <span className={`collapse-arrow`} aria-hidden="true"> {/* Hide arrow from screen reader */}
          ▶ {/* Right-pointing triangle */}
        </span>
        {title}
      </button>
      {/* The actual content - only RENDER if NOT collapsed. Keeps DOM cleaner. */}
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
// Receives the content array, selected item info, loading, error states, and delete handler.
function ContentDisplay({ content, selectedItem, isLoading, error, onDeleteNote }) {

  // Add console log to see received props on every render (for debugging)
  // console.log("ContentDisplay received props:", { content, selectedItem, isLoading, error });

  // --- Loading State --- Show a message while fetching.
  if (isLoading) {
    return <div className="loading">Loading content... hang tight! ⏳</div>;
  }

  // --- Error State --- Show error message if something broke.
  if (error) {
    // Maybe give more detail if error object provides it? For now, just the message.
    return <div className="error">😱 Oh no! Error loading content: {typeof error === 'string' ? error : 'Unknown error'}</div>;
  }

  // --- Placeholder State --- No item selected yet! Guide the user.
  if (!selectedItem) {
    return <div className="placeholder">👈 Select a topic from the sidebar to view notes!</div>;
  }

  // --- Placeholder State --- Item selected, but no content found (empty array or null/undefined)
  // Check if content is an array and if it's empty.
  if (!content || !Array.isArray(content) || content.length === 0) {
    // Construct a helpful message using the selected item details.
    const selectionPath = selectedItem ? `${selectedItem.subject} / ${selectedItem.class} / ${selectedItem.topic}` : 'the selected topic';
    return (
        <div className="placeholder">
            🤔 No notes found for "{selectionPath}".
            Maybe upload some lectures for this topic?
        </div>
    );
  }

  // --- SUCCESS! We have an array of notes to display! ---
  // console.log("ContentDisplay rendering notes array:", content); // Log the notes array being rendered
  return (
    // Main content display area. Uses CSS for layout.
    <main className="content-display">
      {/* Map over the array of note objects received in the 'content' prop */}
      {content.map((note, index) => (
        // Use React.Fragment to group elements for each note without adding extra divs to the DOM.
        // Use a unique key! note._id is best if available.
        <React.Fragment key={note._id || `note-${index}`}>

          {/* --- Individual Note Card/Section --- Styled by .content-section & .note-entry */}
          {/* The .content-section class now has transparent background in App.css */}
          <div className="content-section note-entry">

             {/* --- Note Header Area (Contains Delete Button and Date) --- */}
             <div className="note-header">
                {/* Note Delete Button - REQUIRES note._id! Render only if handler exists */}
                {note._id && onDeleteNote && (
                    <button
                        className="delete-button note-delete-button"
                        title={`Delete this note entry (from ${note.uploadDate ? new Date(note.uploadDate).toLocaleDateString() : 'unknown date'})`}
                        // Call the handler passed from App.jsx with the note's ID and a description
                        onClick={() => onDeleteNote(note._id, `Note from ${note.uploadDate ? new Date(note.uploadDate).toLocaleDateString() : 'unknown date'}`)}
                        aria-label="Delete this note entry"
                    >
                        🗑️ {/* Trash can emoji or an icon component */}
                    </button>
                )}
                 {/* Upload Date - Display if available */}
                 {note.uploadDate && (
                    // Format the date nicely using browser's locale settings.
                    <p className="note-date">
                        <em>Notes from: {new Date(note.uploadDate).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })}</em>
                    </p>
                 )}
             </div>
             {/* --- End Note Header --- */}

            {/* Topics Covered Section - Display if available */}
            {note.topicsCovered && note.topicsCovered.length > 0 && (
              <div className="note-subsection">
                <h4>Topics Covered:</h4>
                {/* Render list if it's an array, otherwise render as text */}
                {Array.isArray(note.topicsCovered) ? (
                  <ul>{note.topicsCovered.map((t, i) => <li key={i}>{t}</li>)}</ul>
                ) : (
                  <p>{note.topicsCovered}</p>
                )}
              </div>
            )}

            {/* Summary Section - Display if available */}
            {note.summary && (
              <div className="note-subsection">
                <h4>Summary:</h4>
                <p>{note.summary}</p>
              </div>
            )}

            {/* --- Resources Section --- Renders the Table --- */}
            <div className="note-subsection">
              <h4>Resources:</h4>
              {/* Check if the structuredResources array exists and has items */}
              {note.structuredResources && Array.isArray(note.structuredResources) && note.structuredResources.length > 0 ? (
                // Yes! Render the table! Give it a class for styling.
                <table className="resource-table">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Text Resource</th>
                      <th>Video Resource</th>
                    </tr>
                  </thead>
                  {/* === FIX: Removed potential whitespace === */}
                  <tbody>{
                    /* Map over the structured resources array for this note */
                    note.structuredResources.map((resourceItem, rIndex) => (
                      // Use topic + index for key, assuming topic is reasonably unique within the note
                      <tr key={`${resourceItem.topic}-${rIndex}`}>
                        {/* Topic Name cell */}
                        <td>{resourceItem.topic || 'N/A'}</td>
                        {/* Google Link cell */}
                        <td>
                          {resourceItem.googleLink ? (
                            // Render link if available. target="_blank" opens in new tab. rel="..." is for security.
                            <a href={resourceItem.googleLink} target="_blank" rel="noopener noreferrer">
                              View Article {/* Generic link text */}
                            </a>
                          ) : (
                            // Show N/A if link is missing/null. Give it a class for styling.
                            <span className="resource-na">N/A</span>
                          )}
                        </td>
                        {/* YouTube Link cell */}
                        <td>
                          {resourceItem.youtubeLink ? (
                            <a href={resourceItem.youtubeLink} target="_blank" rel="noopener noreferrer">
                              Watch Video {/* Generic link text */}
                            </a>
                          ) : (
                            <span className="resource-na">N/A</span> // Show N/A if link missing
                          )}
                        </td>
                      </tr>
                    ))
                  }</tbody>{/* === FIX: Removed potential whitespace === */}
                </table>
              ) : (
                // No structured resources found for this specific note. Show a message.
                <p><em>No specific web resources found for these topics.</em></p>
              )}
            </div>
            {/* --- End Resources Section --- */}


            {/* --- Collapsible Transcript Section --- Display if available --- */}
            {note.transcript && ( // Check if transcript data exists
               <div className="note-subsection">
                    {/* Use our CollapsibleSection component! Starts collapsed! */}
                    <CollapsibleSection title="Transcript" initiallyCollapsed={true}>
                        {/* The actual transcript text goes inside a styled div */}
                        <div className="transcript-area">
                            {note.transcript}
                        </div>
                    </CollapsibleSection>
               </div>
            )}
            {/* --- End Transcript Section --- */}

          </div> {/* End note-entry content-section */}


          {/* --- Divider Line --- Between multiple notes for the same topic! */}
          {/* Add a divider line IF this is NOT the last note in the array */}
          {index < content.length - 1 && (
            <hr className="note-divider" />
          )}

        </React.Fragment> // End loop fragment
      ))} {/* End map over content array */}
    </main> // End content-display main
  ); // End return
} // End ContentDisplay component

export default ContentDisplay;