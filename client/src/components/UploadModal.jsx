import React, { useEffect } from 'react'; // Need useEffect for keyboard listener!
import FileUpload from '../pages/FileUpload'; // Import the uploader logic! Lives in 'pages'

// This is our Popup Window! 
function UploadModal({ isOpen, onClose, onUploadSuccess }) {

  // --- Effect for closing with the Escape key --- d
  useEffect(() => {
    // Define the function to handle key presses
    const handleEsc = (event) => {
      // If the pressed key is 'Escape'...
      if (event.key === 'Escape') {
        console.log("Escape key pressed! Closing modal...");
        onClose(); // Call the close function passed from App.jsx!
      }
    };

    // If the modal IS currently open...
    if (isOpen) {
      // Add the event listener to the whole window!
      window.addEventListener('keydown', handleEsc);
      console.log("Modal opened, added ESC listener.");
    }

    // --- Cleanup Function --- This runs when the component unmounts OR before the effect runs again!
    return () => {
      // Remove the event listener! Gotta clean up after ourselves! Avoid memory leaks!
      window.removeEventListener('keydown', handleEsc);
      console.log("Modal effect cleanup: Removed ESC listener.");
    };
  }, [isOpen, onClose]); // This effect depends on whether the modal is open and the onClose function!

  // --- Render Logic ---

  // If the modal isn't supposed to be open, just render nothing! Poof!
  if (!isOpen) {
    return null;
  }

  // Okay, it IS open! Render the modal structure!
  return (
    // The Modal Overlay: Covers the whole screen, usually semi-transparent!
    // Clicking the overlay itself will close the modal! Sneaky!
    <div className="modal-overlay" onClick={onClose}>

      {/* The Modal Content Box: Where the actual stuff lives! */}
      {/* IMPORTANT: Stop clicks INSIDE the box from bubbling up and closing the modal! */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* The Close Button (like an 'X') */}
        {/* Usually positioned in the top-right corner! */}
        <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
          × {/* Looks like a nice 'X'! */}
        </button>

        {/* Title for the modal */}
        <h2 className="modal-title">Upload New Lecture</h2>

        {/* --- Render the FileUpload component INSIDE the modal! --- */}
        {/* Pass it the onUploadSuccess callback, but wrap it! */}
        <FileUpload
          onUploadSuccess={() => {
            console.log("Upload success detected in modal! Calling refresh AND close...");
            onUploadSuccess(); // First, tell App.jsx to refresh the sidebar!
            onClose(); // THEN, close the modal! Nice flow!
          }}
        />
        {/* --- End FileUpload --- */}

      </div> {/* End modal-content */}
    </div> // End modal-overlay
  );
}

export default UploadModal;