import React from 'react';
import FileUpload from './FileUpload'; // Gotta have the upload thingy here too!

// This is the sidebar... holds the folders and the upload button! Pretty straightforward... kinda!
function Sidebar({ structure, onSelectTopic, selectedItem, onFileUpload, isLoading }) {
  // Get all the main subjects... like "Math", "English", whatever!
  const subjects = Object.keys(structure);
  console.log("Sidebar rendering with subjects:", subjects);

  return (
    // 'aside' is like... a fancy div for sidebars, I guess? Semantic HTML! Yay!
    <aside className="sidebar">
      <h2>My Lectures! ✨</h2>

      {/* This div holds the folder structure... gotta make it grow! */}
      <div style={{ flexGrow: 1 }}>
        {/* If there are no subjects AND we're not loading... tell the user to do something! */}
        {subjects.length === 0 && !isLoading && (
          <p style={{ textAlign: 'center', color: 'var(--secondary-purple)' }}>
            It's kinda empty... maybe upload a lecture?! 🤔
          </p>
        )}
        {/* Let's list out all the subjects... */}
        <ul className="subject-list">
          {subjects.map((subject) => (
            // Each subject gets its own list item... easy!
            <li key={subject} className="subject-item">
              {/* The subject name itself... not clickable, just... there! */}
              <div className="subject-header">{subject}</div>
              {/* And INSIDE each subject... the topics! Nested lists... fun! */}
              <ul className="topic-list">
                {/* Loop through the topics for THIS subject... */}
                {Object.keys(structure[subject]).map((topic) => (
                  // Each topic IS clickable! Woo!
                  <li
                    key={topic} // React needs keys, don't ask me why... okay fine, it's for performance!
                    // Add a 'selected' class if this is the one they clicked... makes it look different!
                    className={`topic-item ${
                      selectedItem?.subject === subject && selectedItem?.topic === topic
                        ? 'selected'
                        : '' // Otherwise... no extra class!
                    }`}
                    // When clicked... tell the main App component which one!!
                    onClick={() => onSelectTopic(subject, topic)}
                  >
                    {topic} {/* Just show the topic name... */}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>


      {/* And at the bottom... the file upload component we made! */}
      <FileUpload onFileUpload={onFileUpload} isLoading={isLoading} />
    </aside>
  );
}

export default Sidebar;