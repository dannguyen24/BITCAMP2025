# StudyEZ ✨📚

**Transform Lectures into Knowledge, Effortlessly.**

StudyEZ is a web application designed to help students process and organize lecture recordings. Upload audio/video files or provide URLs, and StudyEZ uses AI to generate transcriptions, summaries, identify key topics, and find relevant external resources. All notes are automatically categorized by Subject, Class, and Topic, presented in an intuitive, navigable interface.

Built for the BitCamp 2025 Hackathon!

## Key Features

*   **Lecture Upload:** Upload audio/video files directly or provide a URL (e.g., YouTube) for processing.
*   **AI-Powered Transcription:** Utilizes AssemblyAI to generate accurate transcripts from lecture audio.
*   **Intelligent Analysis (via Google Gemini):**
    *   **Automatic Categorization:** Identifies the Subject, Class, and specific Topic of the lecture.
    *   **Summarization:** Generates concise summaries of the lecture content.
    *   **Sub-Topic Identification:** Extracts key sub-topics discussed within the lecture.
*   **Resource Generation:**
    *   Automatically finds relevant web articles (via Google Search) and YouTube videos for each identified sub-topic.
    *   Presents resources in a clear table format.
*   **Organized Navigation:** Displays lectures in a hierarchical, collapsible sidebar (Subject -> Class -> Topic).
*   **Detailed Note View:** Shows upload date, topics covered, summary, structured resources, and a collapsible transcript for each lecture entry. Allows multiple entries per topic.
*   **Customizable UI:**
    *   Resizable sidebar.
    *   Dark/Light theme toggle with preference saved locally.
*   **Content Management:** Delete specific lecture notes, or entire Topic, Class, or Subject folders (with confirmation).

## Tech Stack

**Frontend:**

*   **Framework:** React
*   **Build Tool:** Vite
*   **Routing:** `react-router-dom`
*   **HTTP Client:** `axios` (for uploads), `fetch` API
*   **Styling:** CSS with CSS Variables (supporting Dark/Light themes with a purple motif)

**Backend:**

*   **Framework:** Python + Flask
*   **Environment:** `python-dotenv`
*   **Audio Download:** `yt-dlp`
*   **Database:** MongoDB (likely via `pymongo`)

**AI Services:**

*   **Transcription:** AssemblyAI API
*   **Analysis & Summarization:** Google Generative AI API (Gemini)
*   **Resource Finding:** Google Custom Search API

**Database:**

*   MongoDB (e.g., MongoDB Atlas free tier or local instance)

**Deployment (Planned/Actual):**

*   **Target Domain:** `studyeasy.tech`

## Setup and Installation (Local Development)

Follow these steps to get a local copy up and running.

**Prerequisites:**

*   Node.js and npm (or yarn)
*   Python 3.x and pip
*   Git
*   MongoDB instance (running locally or connection URI for Atlas/other)
*   `ffmpeg` and `ffprobe`: Required by `yt-dlp` for audio processing. Install via your system's package manager (e.g., `sudo apt install ffmpeg`, `brew install ffmpeg`).

**Installation Steps:**

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Backend Setup:**
    ```bash
    cd server # Or your backend directory name
    python3 -m venv venv # Create a virtual environment
    source venv/bin/activate # On Windows use `venv\Scripts\activate`
    pip install -r requirements.txt # Install Python dependencies
    ```
    *   Create a `.env` file in the `server` directory and add the following environment variables (replace placeholders with your actual keys/URIs):
        ```dotenv
        # Example .env for backend
        ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
        GEN_AI=your_google_generative_ai_api_key_here
        MODEL_NAME=gemini-pro # Or your preferred Google model
        GOOGLE_API_KEY=your_google_search_api_key_here
        GOOGLE_CSE_ID=your_google_custom_search_engine_id_here
        MONGO_URI=your_mongodb_connection_string_here # Crucial for database connection
        ```
    *   Run the backend server:
        ```bash
        python app.py
        ```
        The backend should now be running, typically on `http://127.0.0.1:5000`. Check the terminal for MongoDB connection success/errors.

3.  **Frontend Setup:**
    *   Open a *new* terminal window/tab.
    ```bash
    cd ../client # Navigate to the client directory from the root
    npm install # or yarn install
    ```
    *   Create a `.env` file in the `client` directory (or `.env.development` if preferred) and add the backend URL:
        ```dotenv
        # Example .env for frontend (Vite)
        VITE_API_BASE_URL=http://127.0.0.1:5000
        ```
        *(If using Create React App, use `REACT_APP_API_BASE_URL=http://127.0.0.1:5000`)*
    *   Run the frontend development server:
        ```bash
        npm run dev # or yarn dev
        ```
        The frontend should now be accessible, typically at `http://localhost:5173`.

## Usage

1.  Open your browser and navigate to the frontend URL (e.g., `http://localhost:5173`).
2.  You should see the StudyEZ homepage.
3.  *(Authentication Placeholder)* Use the "Go to App (Temp Bypass)" button to access the main application.
4.  Use the "+ Upload" button (top-left of the sidebar) to open the upload modal.
5.  Choose either "Upload File" (select an audio/video file) or "Enter URL" (paste a link, e.g., YouTube).
6.  Click "Upload Selected File" or "Submit URL". The file/URL will be sent to the backend for processing.
7.  Once processing is complete, the sidebar should refresh automatically (via the `onUploadSuccess` callback triggering `fetchStructure`).
8.  Navigate the collapsible sidebar using the arrows next to Subjects and Classes.
9.  Click on a specific Topic to view its generated notes (Date, Topics Covered, Summary, Resources Table, Transcript) in the main content area.
10. Click the Transcript header to expand/collapse the text.
11. Use the theme toggle (☀️/🌙) in the top-right to switch between light and dark modes.
12. Drag the border between the sidebar and content area to resize the sidebar.
13. Double-click a sidebar item (Subject, Class, Topic) to mark it for deletion (strikethrough + trash icon appears). Click the trash icon to confirm deletion.
14. Click the trash icon next to a specific note entry in the content area to delete just that entry.

## Deployment

*   **Domain:** localhost/`studyeasy.tech`
*   **Frontend:** Currently deployed on localhost
*   **Backend:** Currently deployed on localhost

## Team Members (BitCamp 2025)

*   Dan Nyugen
*   Abdullah Ali
*   Michelle Eileen
*   Sesha Sai Lakkavajjala

## Potential Future Improvements

*   **Real User Authentication:** Implement Google OAuth for secure login/signup.
*   **User-Specific Notes:** Associate uploaded lectures and notes with individual user accounts.
*   **Database Storage for Files:** Use AWS S3 or similar for robust storage of original media files instead of just local/temporary storage.
*   **Enhanced Resource Generation:** Generate different types of resources (e.g., flashcards, practice questions).
*   **In-App Search:** Allow users to search through transcripts and summaries.
*   **Direct Audio Recording:** Implement functionality to record audio directly in the browser.
*   **Sharing:** Allow users to share notes or summaries.
*   **UI/UX Polish:** Further refine loading states, error handling, transitions, and visual design.
*   **More AI Features:** Explore sentiment analysis, keyword highlighting, chapter generation within transcripts.

## Acknowledgements

*   AssemblyAI for transcription services.
*   Google Generative AI (Gemini) for analysis.
*   Google Custom Search API for resource finding.
*   React, Flask, Vite, and other open-source libraries used.
*   BitCamp 2025!
