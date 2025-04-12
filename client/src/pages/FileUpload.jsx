import React, { useState } from 'react';
import axios from 'axios'; // Gotta have axios for http requests! Like fetch but... different? Idk!

function FileUpload({ onUploadSuccess }) { 
  const [file, setFile] = useState(null); // Still keeps track of the chosen file... locally!
  const [isUploading, setIsUploading] = useState(false); // Let's track if it's busy!

  // User picked a file...
  const handleChange = (e) => {
    setFile(e.target.files[0]);
    console.log("File chosen in FileUpload:", e.target.files[0]?.name || "None");
  };

  // User hit the button! Let's send it off! 🚀
  const handleUpload = async () => {
    // No file? 
    if (!file) {
        alert("Hey! Pick a file first! 😉");
        return;
    }
    // Don't click upload twice while it's working!! Sheesh!
    if (isUploading) return;

    setIsUploading(true); // Okay, NOW we're busy!
    const formData = new FormData(); // Magic box for sending files!
    formData.append('file', file); // Put the file in the box, label it 'file'! (Backend needs this name!)

    try {
      console.log("Uploading via axios to http://localhost:5000/upload ...");
      // --- Sending the file to the backend! Fingers crossed! ---
      const res = await axios.post('http://localhost:5000/upload', formData, {
        // Important header! Tells the server "Hey, this isn't just text, it has files!"
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // IT WORKED! Probably! The backend sent something back!
      console.log("Upload response:", res.data);
      alert('File uploaded successfully! 🎉 Backend says: ' + res.data); // Tell the user!

      // If the parent gave us an onUploadSuccess function... CALL IT NOW!
      if (onUploadSuccess) {
        console.log("Calling onUploadSuccess callback!");
        onUploadSuccess(); // Tell the parent (App.jsx) to refresh!
      }

    } catch (err) {
      // Aww, it failed! 😭
      console.error("Axios upload failed:", err);
      // Show a useful-ish error... maybe the network response had details?
      let errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Upload failed 😢: ${errorMsg}`);
    } finally {
      // Okay, we're not busy anymore, whether it worked or failed!
      setIsUploading(false);
      // Maybe clear the file selection after attempting upload? Seems polite.
      setFile(null);
    }
  };

  // The simple look for this component... just an input and a button!
  return (
    // Let's add a specific class for potential styling within the sidebar later...
    <div className="sidebar-file-upload">
      {/* Maybe a little header inside the sidebar section? */}
      <h4 style={{ marginTop: '15px', marginBottom: '8px', color: 'var(--accent-purple)' }}>Upload New Lecture:</h4>
      <input
        type="file"
        onChange={handleChange}
        // Disable if currently uploading! Safety first!
        disabled={isUploading}
        // Maybe some basic styling? Let's rely on App.css for general input/button for now...
      />
      <button
        onClick={handleUpload}
        // Disable button if no file selected OR if uploading! Logical!
        disabled={!file || isUploading}
        // Change text while uploading... nice touch!
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
      {/* Show the selected filename maybe? */}
      {file && !isUploading && <p style={{fontSize: '0.8em', margin: '5px 0 0 0', color: 'var(--secondary-purple)', overflowWrap: 'break-word'}}>Selected: {file.name}</p>}
    </div>
  );
}

export default FileUpload;
