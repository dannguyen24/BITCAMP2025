import React, { useState } from 'react';
import axios from 'axios';

function FileUpload() {
  const [file, setFile] = useState(null);

  const handleChange = (e) => {
    setFile(e.target.files[0]); // Get the file the user picked
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData(); // used to send files via HTTP
    formData.append('file', file); // match this 'file' to Flask's request.files['file']

    try {
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // set content type to multipart/form-data
        },
      });
      alert('File uploaded: ' + res.data);
    } catch (err) {
      alert('Upload failed 😢');
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Upload File</h2>
      <input type="file" onChange={handleChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

export default FileUpload;
