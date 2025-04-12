import React, { useState } from 'react'; // Still need useState!
import axios from 'axios'; // Axios for those sweet HTTP requests!

// This component handles BOTH file uploads AND URL submissions now! Double duty!
function FileUpload({ onUploadSuccess }) {
  // === State Variables ===
  const [file, setFile] = useState(null); // For the selected file (if file mode)
  const [urlInput, setUrlInput] = useState(""); // For the entered URL (if url mode)
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url' - Start with file upload!
  const [isUploading, setIsUploading] = useState(false); // Are we busy uploading EITHER type?
  // === End State ===

  // --- Event Handlers ---

  // When the user picks a file using the file input...
  const handleFileChange = (e) => {
    setFile(e.target.files[0]); // Grab the first file they selected!
    console.log("File selected:", e.target.files[0]?.name || "None");
  };

  // When the user types into the URL input field...
  const handleUrlChange = (e) => {
    setUrlInput(e.target.value); // Update the URL state with what they typed!
  };

  // Function to handle uploading the selected FILE! (Renamed from original handleUpload)
  const handleUploadFile = async () => {
    if (!file) return; // Should already be handled by button disable, but belt and braces!

    console.log("Uploading FILE via axios to http://localhost:5000/upload ...");
    setIsUploading(true); // We're busy!
    const formData = new FormData(); // File needs FormData!
    formData.append('file', file); // Key 'file' must match backend!

    try {
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // Tell backend it's a file!
      });
      console.log("File upload response:", res.data);
      alert('File uploaded successfully! 🎉 Backend says: ' + res.data);
      if (onUploadSuccess) onUploadSuccess(); // Tell App.jsx to refresh!
      setFile(null); // Clear the file state
    } catch (err) {
      console.error("Axios file upload failed:", err);
      let errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`File upload failed 😢: ${errorMsg}`);
    } finally {
      setIsUploading(false); // Not busy anymore!
    }
  };

  // NEW Function to handle submitting the entered URL!
  const handleUploadUrl = async () => {
    if (!urlInput || !urlInput.trim()) return; // Make sure URL isn't empty or just spaces!

    console.log("Submitting URL via axios to http://localhost:5000/upload_link ...");
    setIsUploading(true); // We're busy!

    try {
      // For URL, we send JSON data, not FormData!
      const payload = { url: urlInput.trim() }; // Send an object with a 'url' key! Trim whitespace!
      const res = await axios.post('http://localhost:5000/upload_link', payload, {
        headers: { 'Content-Type': 'application/json' }, // Tell backend it's JSON! IMPORTANT!
      });
      console.log("URL submission response:", res.data);
      alert('URL submitted successfully! 👍 Backend says: ' + res.data);
      if (onUploadSuccess) onUploadSuccess(); // Tell App.jsx to refresh!
      setUrlInput(""); // Clear the URL input state
    } catch (err) {
      console.error("Axios URL submission failed:", err);
      let errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`URL submission failed 😥: ${errorMsg}`);
    } finally {
      setIsUploading(false); // Not busy anymore!
    }
  };

  // The MAIN upload button's click handler! Decides what to do based on the mode!
  const handleUploadClick = () => {
    if (uploadMode === 'file') {
      handleUploadFile(); // If file mode, call the file upload function!
    } else if (uploadMode === 'url') {
      handleUploadUrl(); // If url mode, call the URL upload function!
    } else {
      console.error("Unknown upload mode!", uploadMode); // Uh oh, shouldn't happen!
    }
  };

  // --- Helper to switch modes ---
  const switchMode = (newMode) => {
    if (newMode === uploadMode) return; // Already in this mode, do nothing!
    console.log("Switching upload mode to:", newMode);
    setUploadMode(newMode);
    // Clear the other mode's input when switching! Less confusing!
    if (newMode === 'file') {
      setUrlInput("");
    } else {
      setFile(null);
      // Maybe reset the file input visually? Tricky, let's skip for now.
    }
  };

  // --- Determine if the main button should be disabled ---
  const isUploadDisabled = isUploading || // Always disable if uploading!
                           (uploadMode === 'file' && !file) || // Disable if file mode and no file selected!
                           (uploadMode === 'url' && (!urlInput || !urlInput.trim())); // Disable if URL mode and URL is empty/whitespace!

  // --- The Rendered JSX --- Let's make it look good! ---
  return (
    <div className="sidebar-file-upload">
      {/* Optional Header */}
      <h4 style={{ marginTop: '15px', marginBottom: '8px', color: 'var(--accent-purple)' }}>Upload New Lecture:</h4>

      {/* --- Mode Switcher Tabs/Buttons --- */}
      <div className="upload-mode-switcher">
        <button
          onClick={() => switchMode('file')}
          className={uploadMode === 'file' ? 'active' : ''} // Style the active tab!
          disabled={isUploading} // Disable switching while uploading!
        >
          Upload File
        </button>
        <button
          onClick={() => switchMode('url')}
          className={uploadMode === 'url' ? 'active' : ''} // Style the active tab!
          disabled={isUploading} // Disable switching while uploading!
        >
          Enter URL
        </button>
      </div>
      {/* --- End Mode Switcher --- */}

      {/* --- Conditional Rendering Area --- */}
      <div className="upload-input-area">
        {/* Show File Input ONLY if in 'file' mode */}
        {uploadMode === 'file' && (
          <div className="file-input-section">
            <input
              type="file"
              onChange={handleFileChange}
              disabled={isUploading} // Disable if uploading!
              key={file ? file.name : 'file-input'} // Hacky way to potentially help reset view, maybe remove
            />
            {/* Show selected file name if not uploading */}
            {file && !isUploading && <p>Selected: {file.name}</p>}
          </div>
        )}

        {/* Show URL Input ONLY if in 'url' mode */}
        {uploadMode === 'url' && (
          <div className="url-input-section">
            <input
              type="text"
              placeholder="Paste lecture URL here..." // Helpful placeholder!
              value={urlInput} // Controlled input! Value comes from state!
              onChange={handleUrlChange} // Update state on change!
              disabled={isUploading} // Disable if uploading!
              className="url-input-field" // Add class for styling!
            />
          </div>
        )}
      </div>
      {/* --- End Conditional Rendering Area --- */}


      {/* --- The MAIN Upload Button --- */}
      {/* Calls the combined handler onClick! */}
      <button
        onClick={handleUploadClick}
        disabled={isUploadDisabled} // Use our combined disable logic!
        className="main-upload-button" // Give it a distinct class maybe?
      >
        {isUploading ? 'Processing...' : (uploadMode === 'file' ? 'Upload File' : 'Submit URL')}
        {/* Change button text based on mode and loading state! Nice! */}
      </button>
      {/* --- End Main Upload Button --- */}

    </div> // End sidebar-file-upload div
  );
}

export default FileUpload; // Export it! Make it available!
