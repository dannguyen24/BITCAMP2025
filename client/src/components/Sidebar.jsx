// src/components/Sidebar.jsx

// Gotta get React, specifically forwardRef 'cause App.jsx is passing a ref down! Fancy!
import React from 'react';
// And we need our FileUpload component, which lives up one level in 'pages'!
import FileUpload from '../pages/FileUpload';

// Wrap the whole component definition in React.forwardRef!
// It receives 'props' (which we destructure) and the 'ref' from the parent (App.jsx)!
const Sidebar = React.forwardRef(({ structure, onSelectTopic, selectedItem, onUploadSuccess, style, onResizeMouseDown }, ref) => {
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
      {/* The title! Gotta have a title! */}
      <h2>My Lectures! ✨</h2>

      {/* This div holds the main scrolling content (the folders) */}
      {/* Needs 'overflow-y: auto' in CSS so it scrolls if needed! */}
      <div className="sidebar-content-scrollable">
        {/* If there are no subjects yet, show a little message! */}
        {subjects.length === 0 && (
           <p style={{ textAlign: 'center', color: 'var(--secondary-purple)' }}>
               Loading... or maybe just empty? Try uploading! 🤔
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
                    className={`topic-item ${
                      selectedItem?.subject === subject && selectedItem?.topic === topic
                        ? 'selected'
                        : '' // Empty string if not selected!
                    }`}
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

      {/* And finally, the file upload section at the bottom! */}
      <div className="file-upload-area">
          {/* Render the FileUpload component! */}
          {/* Pass down the 'onUploadSuccess' function so it can tell App.jsx to refresh! */}
          <FileUpload onUploadSuccess={onUploadSuccess} />
      </div>
      {/* --- End Visible Content --- */}

    </aside> // End of the <aside> element
  ); // End of return statement
}); // End of React.forwardRef wrapper

// Export the Sidebar component! Make it usable!
export default Sidebar;