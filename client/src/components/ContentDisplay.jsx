import React from 'react';

// This component just... shows the stuff! Transcript, resources... you know!
function ContentDisplay({ content, selectedItem, isLoading, error }) {

  // If we're loading AND there's no old content showing... show a loading message!
  if (isLoading && !content) {
    return <div className="loading">Loading content... patience, young padawan! 🙏</div>;
  }

  // Uh oh... something went wrong! Gotta tell the user!
  if (error) {
      // Display the error message we got... hopefully it's helpful!
      return <div className="error">😱 Oh no! Error: {error} ... maybe try again? ¯\_(ツ)_/¯</div>;
  }

  // If nothing is selected in the sidebar yet... guide the user!
  if (!selectedItem) {
    return <div className="placeholder">👈 Click a topic over there to see the magic happen!</div>;
  }

  // Maybe something IS selected, but the content hasn't loaded yet for some reason? Idk... cover bases!
  if (!content) {
     return <div className="placeholder">Hmm... no content found for this topic yet. Weird! 🤔</div>;
  }

  // Okay, finally! We have content to show! Let's render it!
  return (
    // 'main' is another semantic tag... for the main content area! Makes sense!
    <main className="content-display">
       {/* Maybe show a *small* loading indicator even if content IS showing... like for refreshes! Subtle! */}
       {isLoading && <div className="loading" style={{ position: 'absolute', top: '10px', right: '20px', fontSize: '0.9em'}}>Updating... ✨</div>}

      {/* Section for the transcription text... */}
      <div className="content-section">
        <h3>Transcription! 🗣️</h3>
        {/* Using a div with pre-wrap to keep the formatting... kinda important for transcripts! */}
        <div className="transcript-area">
          {/* Show the transcript... or a sad message if there isn't one! */}
          {content.transcript || 'No transcript here... awkward! 😬'}
        </div>
      </div>

      {/* Section for the generated resources... study guides, quizzes, whatever! */}
      <div className="content-section">
        <h3>Generated Resources! 🤖📚</h3>
        {/* Another formatted text area... */}
        <div className="resources-area">
          {/* Show the resources... or another sad message! */}
          {content.resources || 'Looks like no resources were generated... hmm! 🤔'}
        </div>
      </div>
    </main>
  );
}

export default ContentDisplay;