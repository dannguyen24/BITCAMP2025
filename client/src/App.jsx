import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ContentDisplay from './components/ContentDisplay';
import './App.css'; // Pretty styles! Gotta have 'em!

// This is the main brain of the operation! Holds all the important states!🧠
function App() {
  // State for the whole folder structure thingy... starts empty!
  const [folderStructure, setFolderStructure] = useState({}); // Like: { "Math": { "Algebra": {} } } ...something like that!
  // State for WHICH specific lecture is currently selected... starts as null!
  const [selectedItem, setSelectedItem] = useState(null); // Like: { subject: "Math", topic: "Algebra" }
  // State for the actual transcript and resources of the selected item... null again!
  const [currentContent, setCurrentContent] = useState(null); // Like: { transcript: "...", resources: "..." }
  // Are we busy doing something? Like uploading or fetching? Let's track it!
  const [isLoading, setIsLoading] = useState(false);
  // Did something break?! Oh no! Let's store the error message...
  const [error, setError] = useState(null);

  // This function fetches the folder structure from the backend... useCallback helps prevent unnecessary re-renders, maybe? Idk, seems smart!
  const fetchStructure = useCallback(async () => {
    console.log("Gonna fetch the structure... wish me luck!");
    // Don't set loading here... avoid flashy loading state on initial load or simple refreshes!
    setError(null); // Clear old errors first! Fresh start!
    try {
      // --- MAKE SURE THIS URL IS RIGHT!! --- It's probably '/api/structure' or something...
      const response = await fetch('/api/structure'); // The actual API call!
      // Did it work?! Check the status code!
      if (!response.ok) {
         // Uh oh... throw an error so the 'catch' block handles it!
         throw new Error(`HTTP error! Status: ${response.status} ... oops!`);
      }
      const data = await response.json(); // Get the juicy JSON data!
      console.log("Got structure data! Looks like:", data);
      // Update the state! Make sure it's an object even if the API messes up and sends null... 🙄
      setFolderStructure(data || {});
    } catch (err) {
      // Catching errors... like a pro! (or trying to...)
      console.error("Failed to fetch structure! Sad!", err);
      // Tell the user something broke...
      setError(`Couldn't load lecture structure: ${err.message}. Is the backend even running?? 🤔`);
      setFolderStructure({}); // Reset to empty structure on error... probably safest!
    } finally {
        // No loading indicator set/unset here... handled elsewhere!
    }
    // Empty array means this useCallback function *itself* doesn't change unless React remounts... stability!
  }, []);

  // useEffect hook! This runs when the component first mounts (like page load)...
  useEffect(() => {
    console.log("Component mounted! Time to fetch the initial structure...");
    fetchStructure(); // Call the function we defined above!
  }, [fetchStructure]); // Dependency array... makes sure it runs when fetchStructure is defined (which is basically once)

  // Another useEffect! This one runs whenever the 'selectedItem' state changes... magic!
  useEffect(() => {
    // If nothing is selected... just clear the content and do nothing else! Easy!
    if (!selectedItem) {
      console.log("Selection cleared... setting content to null.");
      setCurrentContent(null);
      return; // Stop right here!
    }

    // Okay, something *is* selected! Let's fetch its content!
    const fetchContent = async () => {
      console.log("Fetching content for:", selectedItem);
      setIsLoading(true); // YES, we are loading now! Show the indicator!
      setError(null); // Clear previous errors... new selection, new hope!
      setCurrentContent(null); // Clear out old content right away! Feels faster!
      try {
        // Destructure the subject and topic... fancy!
        const { subject, topic } = selectedItem;
        // --- AGAIN, MAKE SURE THIS URL IS CORRECT!! --- Use query params!
        // Need encodeURIComponent just in case subjects/topics have spaces or weird characters... safety first!
        const response = await fetch(`/api/content?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`);
         // Check AGAIN if the fetch worked...
         if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}... darn it!`);
        }
        const data = await response.json(); // Get the content JSON!
        console.log("Got content data!", data);
        setCurrentContent(data); // Update the state with the transcript and resources! Yay!
      } catch (err) {
        // Error handling... again! Important stuff!
        console.error("Failed to fetch content!", err);
        setError(`Couldn't load content for ${selectedItem.topic}: ${err.message}`);
        setCurrentContent(null); // Clear content on error too...
      } finally {
        // Whether it worked or failed... we are DONE loading for now!
        setIsLoading(false);
      }
    };

    fetchContent(); // Call the async function we just defined inside the hook!
    // This hook depends on 'selectedItem'... so it re-runs every time selectedItem changes!
  }, [selectedItem]);


  // This function gets called by the FileUpload component... handles the actual upload logic!
  const handleFileUpload = async (file) => {
    console.log("Handling file upload in App.jsx for:", file.name);
    setIsLoading(true); // We're definitely loading now! Big time!
    setError(null); // Clear errors... optimistic!
    // Maybe clear selection and content while uploading? Seems polite!
    setSelectedItem(null);
    setCurrentContent(null);

    // FormData is special... needed for sending files! Don't ask me the details... it just works! 🤷
    const formData = new FormData();
    formData.append('file', file); // The backend needs to look for a field named 'file'! Important!

    try {
      // --- THE UPLOAD URL! GET IT RIGHT! --- Usually a POST request!
      const response = await fetch('/api/upload', {
        method: 'POST', // Gotta tell it it's a POST!
        body: formData, // The FormData object with the file!
        // Headers... often not needed for FormData, browser handles it... usually! Let's skip 'em for now!
        // headers: { 'Content-Type': 'multipart/form-data' } // Probably automatic... hopefully!
      });

       // Did the UPLOAD work?! Check response!
       if (!response.ok) {
            // Try to get a nicer error message from the backend if it sent one... maybe JSON?
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json(); // Try parsing JSON error...
                // Use the error message from JSON if available!
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) { /* JSON parsing failed? Just use the status code then... oh well! */ }
            throw new Error(errorMsg); // Throw the (hopefully helpful) error!
        }

      // If we got here... SUCCESS! The backend processed the file! Amazing!
      // Now, the sidebar structure *might* have changed... so let's just refetch it! Easiest way!
      console.log("Upload seems successful! Refetching structure to update sidebar...");
      await fetchStructure(); // Call our trusty fetchStructure function again!

    } catch (err) {
      // Upload failed... bummer!
      console.error("Upload failed! :(", err);
      setError(`Upload failed: ${err.message}`); // Show the error!
    } finally {
      // Done loading, whether it worked or not!
      setIsLoading(false);
    }
  };

  // This gets called by the Sidebar when a topic is clicked...
  const handleSelectTopic = (subject, topic) => {
    console.log("Topic selected in App.jsx:", subject, topic);
    // Check if it's ACTUALLY a different topic than the one already selected... prevents useless updates!
    if (selectedItem?.subject !== subject || selectedItem?.topic !== topic) {
        // It IS different! Update the selectedItem state!
        setSelectedItem({ subject, topic });
        // The useEffect hook watching 'selectedItem' will automatically fetch the content now! Cool!
    } else {
        console.log("...but it's the same one already selected. Doing nothing!")
    }
  };


  // Finally, the JSX for the whole App! Structure time!
  return (
    // The main container div... flexbox magic happens in CSS!
    <div className="app-container">
      {/* Render the Sidebar... pass down all the state and functions it needs! */}
      <Sidebar
        structure={folderStructure}
        onSelectTopic={handleSelectTopic}
        selectedItem={selectedItem}
        onFileUpload={handleFileUpload}
        // Only pass true isLoading for the upload button if content isn't ALSO loading... avoids disabling upload during content fetch! ...maybe?
        isLoading={isLoading && !currentContent}
      />
      {/* Render the Content Display area... pass down the stuff it needs too! */}
      <ContentDisplay
        content={currentContent}
        selectedItem={selectedItem}
        isLoading={isLoading} // Let it know if *anything* is loading!
        error={error} // Pass down any errors!
      />
    </div>
  );
}

export default App; // Export the component so index.js (or main.jsx) can use it! Done! 🎉
