import React, { useState } from 'react';
// import { FaTrashAlt } from 'react-icons/fa'; // Example icon import

// Collapsible Section Component (Unchanged)
function CollapsibleSection({ title, children, initiallyCollapsed = true }) { /* ... */ }

// --- Main Content Display Component --- Receives onDeleteNote prop! ---
function ContentDisplay({ content, selectedItem, isLoading, error, onDeleteNote }) { // Added onDeleteNote

  // Loading, Error, Placeholder states (Unchanged)
  if (isLoading) { return <div className="loading">Loading... ⏳</div>; }
  if (error) { return <div className="error">😱 Error: {error}</div>; }
  if (!selectedItem) { return <div className="placeholder">👈 Select a topic!</div>; }
  if (!content || !Array.isArray(content) || content.length === 0) {
    const selectionPath = selectedItem ? `${selectedItem.subject} / ${selectedItem.class} / ${selectedItem.topic}` : '...';
    return ( <div className="placeholder"> 🤔 No notes for "{selectionPath}". Upload some? </div> );
  }

  // --- SUCCESS! We have notes! ---
  return (
    <main className="content-display">
      {/* Map over the array of note objects */}
      {content.map((note, index) => (
        <React.Fragment key={note._id || index}> {/* Use note._id for key if available! */}

          {/* --- Individual Note Card/Section --- */}
          <div className="content-section note-entry">

             {/* --- Note Header Area (Date and Delete Button) --- */}
             <div className="note-header">
                {/* Upload Date */}
                {note.uploadDate && ( <p className="note-date"> <em>Notes from: {new Date(note.uploadDate).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })}</em> </p> )}
                {/* Note Delete Button - REQUIRES note._id! */}
                {note._id && onDeleteNote && ( // Only show if we have an ID and handler
                    <button
                        className="delete-button note-delete-button"
                        title={`Delete this note entry (from ${note.uploadDate ? new Date(note.uploadDate).toLocaleDateString() : 'unknown date'})`}
                        onClick={() => onDeleteNote(note._id, `Note from ${new Date(note.uploadDate).toLocaleDateString()}`)} // Pass note._id and description
                        aria-label="Delete this note entry"
                    >
                        🗑️
                        {/* <FaTrashAlt /> */}
                    </button>
                )}
             </div>
             {/* --- End Note Header --- */}

            {/* Topics Covered Section */}
            {note.topicsCovered && note.topicsCovered.length > 0 && ( <div className="note-subsection"> <h4>Topics Covered:</h4> {Array.isArray(note.topicsCovered) ? ( <ul>{note.topicsCovered.map((t, i) => <li key={i}>{t}</li>)}</ul> ) : ( <p>{note.topicsCovered}</p> )} </div> )}

            {/* Summary Section */}
            {note.summary && ( <div className="note-subsection"> <h4>Summary:</h4> <p>{note.summary}</p> </div> )}

            {/* Resources Section (Table) */}
            <div className="note-subsection"> <h4>Resources:</h4> {/* ... Resource Table JSX ... */} {note.structuredResources && Array.isArray(note.structuredResources) && note.structuredResources.length > 0 ? ( <table className="resource-table"><thead><tr><th>Topic</th><th>Text Resource</th><th>Video Resource</th></tr></thead><tbody> {note.structuredResources.map((r, i) => (<tr key={`${r.topic}-${i}`}><td>{r.topic||'N/A'}</td><td>{r.googleLink?<a href={r.googleLink} target="_blank" rel="noopener noreferrer">View Article</a>:<span className="resource-na">N/A</span>}</td><td>{r.youtubeLink?<a href={r.youtubeLink} target="_blank" rel="noopener noreferrer">Watch Video</a>:<span className="resource-na">N/A</span>}</td></tr>))} </tbody></table> ) : ( <p><em>No specific web resources found.</em></p> )} </div>

            {/* Collapsible Transcript Section */}
            {note.transcript && ( <div className="note-subsection"> <CollapsibleSection title="Transcript" initiallyCollapsed={true}> <div className="transcript-area"> {note.transcript} </div> </CollapsibleSection> </div> )}

          </div> {/* End note-entry content-section */}

          {/* Divider Line */}
          {index < content.length - 1 && ( <hr className="note-divider" /> )}

        </React.Fragment>
      ))} {/* End map */}
    </main>
  );
}

export default ContentDisplay;