import React, { useState } from 'react'; // Need useState for collapsible sections!

// --- Sub-Component for Collapsible Section --- Helper! ---
// This makes managing the collapsed state easier for each transcript..
function CollapsibleSection({ title, children, initiallyCollapsed = true }) {
  // State within THIS component to track if it's collapsed! Starts collapsed by default.
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
// Receives the content array, selected item info, loading, and error states.
function ContentDisplay({ content, selectedItem, isLoading, error }) {

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
  console.log("ContentDisplay rendering notes:", content); // Log the notes array being rendered
  return (
    // Main content display area. Uses CSS for layout.
    <main className="content-display">
      {/* Map over the array of note objects received in the 'content' prop */}
      {content.map((note, index) => (
        // Use React.Fragment to group elements for each note without adding extra divs to the DOM.
        // Use a unique key! uploadDate + index is usually okay for mock, real ID preferred.
        <React.Fragment key={note.uploadDate ? `${note.uploadDate}-${index}`: index}>

          {/* --- Individual Note Card/Section --- Styled by .content-section & .note-entry */}
          <div className="content-section note-entry">

            {/* 1. Upload Date - Display if available */}
            {note.uploadDate && (
              // Format the date nicely using browser's locale settings.
              <p className="note-date">
                <em>Notes from: {new Date(note.uploadDate).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })}</em>
              </p>
            )}

            {/* 2. Topics Covered Section - Display if available */}
            {/* Still useful to see the original topics list maybe? */}
            {note.topicsCovered && note.topicsCovered.length > 0 && (
              <div className="note-subsection">
                <h4>Topics Covered:</h4>
                {/* Check if it's an array or just a string (handle both if needed) */}
                {Array.isArray(note.topicsCovered) ? (
                  <ul>{note.topicsCovered.map((t, i) => <li key={i}>{t}</li>)}</ul>
                ) : (
                  <p>{note.topicsCovered}</p> /* Render as paragraph if it's just a string */
                )}
              </div>
            )}

            {/* 3. Summary Section - Display if available */}
            {note.summary && (
              <div className="note-subsection">
                <h4>Summary:</h4>
                <p>{note.summary}</p>
              </div>
            )}

            {/* --- 4. Resources Section --- *** RENDERS THE TABLE *** --- */}
            <div className="note-subsection">
              <h4>Resources:</h4>
              {/* Check if the NEW structuredResources array exists and has items */}
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
                  <tbody>
                    {/* Map over the structured resources array for this note */}
                    {note.structuredResources.map((resourceItem, rIndex) => (
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
                    ))}
                  </tbody>
                </table>
              ) : (
                // No structured resources found for this specific note. Show a message.
                <p><em>No specific web resources found for these topics.</em></p>
                // Optional Fallback: Display old 'resources' text block if it exists and structuredResources is missing?
                // note.resources && !note.structuredResources && <div className="resources-area">{note.resources}</div>
              )}
            </div>
            {/* --- End Modified Resources Section --- */}


            {/* 5. Collapsible Transcript Section - Display if available */}
            {note.transcript && (
               <div className="note-subsection">
                    {/* Use our new CollapsibleSection component! Starts collapsed (true)! */}
                    <CollapsibleSection title="Transcript" initiallyCollapsed={true}>
                        {/* The actual transcript text goes inside */}
                        <div className="transcript-area">
                            {note.transcript}
                        </div>
                    </CollapsibleSection>
               </div>
            )}

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

// Export it! Make it available!
export default ContentDisplay;