import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import FileUpload from "./pages/FileUpload";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>File Upload Example</h1>

      <Routes>
        <Route path="/" element={<h2>Home Page</h2>} />
        <Route path="/upload" element={<FileUpload />} />
      </Routes>
    </>
  );
}

export default App;
