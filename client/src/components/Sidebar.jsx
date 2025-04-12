import React from 'react';
import FileUpload from '../pages/FileUpload'; 

// Sidebar's job: Show folders, let user click topics, AND host the upload component!
// It gets the callback function 'onUploadSuccess' from App.jsx!
function Sidebar({ structure, onSelectTopic, selectedItem, onUploadSuccess }) { // Added onUploadSuccess prop! Removed old upload props.
  const subjects = Object.keys(structure);
  console.log("Sidebar rendering with subjects:", subjects);

  return (
    <aside className="sidebar">
      <h2>My Lectures! ✨</h2>

      {/* This div holds the folder structure... */}
      <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '5px' }}> {/* Added scroll + padding */}
        {subjects.length === 0 && ( // Let's show loading state if App passes isLoading, otherwise show empty message
           <p style={{ textAlign: 'center', color: 'var(--secondary-purple)' }}>
               Loading structure or no lectures uploaded yet... 🤔
            </p>
        )}
        <ul className="subject-list">
          {subjects.map((subject) => (
            <li key={subject} className="subject-item">
              <div className="subject-header">{subject}</div>
              <ul className="topic-list">
                {Object.keys(structure[subject]).map((topic) => (
                  <li
                    key={topic}
                    className={`topic-item ${
                      selectedItem?.subject === subject && selectedItem?.topic === topic
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => onSelectTopic(subject, topic)}
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>


      {/* --- RENDER THE FILE UPLOAD COMPONENT --- */}
      {/* We just slap the component from src/pages right here! */}
      {/* And crucially, pass down the onUploadSuccess function we got from App.jsx! */}
      <div className="file-upload-area"> {/* Keep the styling container maybe? */}
          <FileUpload onUploadSuccess={onUploadSuccess} />
      </div>

    </aside>
  );
}

export default Sidebar;