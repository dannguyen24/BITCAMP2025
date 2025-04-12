// Gotta get React, specifically forwardRef 'cause App.jsx is passing a ref down! 
import React from 'react';
// !!! No longer need FileUpload import here! It lives in the Modal now! !!!
// import FileUpload from '../pages/FileUpload';

// Okay, wrap the whole component definition in React.forwardRef!
// It receives 'props' (which we destructure) and the 'ref' from the parent (App.jsx)!
// Gets the new 'onOpenUploadModal' prop now! Doesn't need 'onUploadSuccess' anymore!
const Sidebar = React.forwardRef(({ structure, onSelectTopic, selectedItem, style, onResizeMouseDown, onOpenUploadModal }, ref) => {
  // Get the list of subjects (like "Math", "English") from the structure data!
  const subjects = Object.keys(structure);

  // Time to return the JSX! This is what the sidebar actually looks like!
  return (
    // The main <aside> tag! It's like a div but more semantic for a sidebar!
    // Apply the 'style' prop (which has the dynamic width!) right here!
    // AND attach the 'ref' so App.jsx can have a bookmark to this DOM element!
    // Also need 'position: relative' for the absolute handle inside! (CSS handles this!)
    <aside className="sidebar" style={style} ref={ref}>

      {/* --- The INVISIBLE Draggable Border Handle! --- */}
      {/* This little div is sneaky! It sits on the right edge, waiting for a mousedown! */}
      {/* Give it a class name so we can style it with CSS! */}
      {/* Attach the onResizeMouseDown function that App.jsx passed down! This STARTS the drag! */}
      <div
        className="sidebar-border-handle"
        onMouseDown={onResizeMouseDown} // Trigger App.jsx's handleMouseDown when clicked!
      />
      {/* --- End Invisible Handle --- Poof! It's invisible (mostly)! --- */}


      {/* --- The ACTUAL Visible Content --- */}

      {/* --- Title Area --- Now with an Upload Button! --- */}
      {/* Wrap title and button in a div for easy flex layout! */}
      <div className="sidebar-title-area">
        {/* The title! Gotta have a title! */}
        <h2>My Lectures! ✨</h2>
        {/* The button to open the modal! Calls the function passed from App.jsx! */}
        <button
            onClick={onOpenUploadModal} // CLICK ME to open the popup! Calls App.jsx's openModal function!
            className="upload-modal-button" // Class for styling!
            title="Upload New Lecture" // Tooltip for accessibility/clarity!
        >
          + Upload {/* Simple text or an icon! You choose! */}
        </button>
      </div>
      {/* --- End Title Area --- */}


      {/* This div holds the main scrolling content (the folders) */}
      {/* Needs 'overflow-y: auto' in CSS so it scrolls if needed! */}
      <div className="sidebar-content-scrollable">
        {/* If there are no subjects yet, show a little message! */}
        {subjects.length === 0 && (
           <p style={{ textAlign: 'center', color: 'var(--secondary-purple)' }}>
               Loading... or maybe just empty? Try uploading via the button above! 🤔
            </p>
        )}
        {/* The list of subjects! */}
        <ul className="subject-list">
          {/* Loop through each subject! */}
          {subjects.map((subject) => (
            <li key={subject} className="subject-item">
              {/* Show the subject name! */}
              <div className="subject-header">{subject}</div>
              {/* Nested list for topics within this subject! */}
              <ul className="topic-list">
                {/* Loop through the topics! */}
                {Object.keys(structure[subject]).map((topic) => (
                  <li
                    key={topic} // React keys... essential!
                    // Add 'selected' class if this is the one! Highlights it!
                    className={`topic-item ${ selectedItem?.subject === subject && selectedItem?.topic === topic ? 'selected' : '' }`}
                    // When clicked, call the function from App.jsx! Tell it which one!
                    onClick={() => onSelectTopic(subject, topic)}
                  >
                    {topic} {/* The topic name itself! */}
                  </li>
                ))}
              </ul> {/* End topics list */}
            </li> // End subject item
          ))}
        </ul> {/* End subjects list */}
      </div> {/* End scrollable area */}


      {/* --- The old FileUpload area is GONE! Removed! Deleted! --- */}
      {/* It now lives inside the UploadModal component! Cleaner sidebar! Yay! */}
      {/* --- End Removed Area --- */}

    </aside> // End of the <aside> element
  ); // End of return statement
}); // IMPORTANT! Close the React.forwardRef wrapper!

// Export the Sidebar component! Make it usable!
export default Sidebar;