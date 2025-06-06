import React from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
    const navigate = useNavigate();
    return (
        <div>
            <h1>StudyEZ</h1>
            <p>Manage your studying</p>
            <div>
                <button onClick={() => {navigate("/login")}}>Login</button>
                <button onClick={() => {navigate("/signup")}}>Signup</button>
            </div>

        </div>
  )
}

export default Home