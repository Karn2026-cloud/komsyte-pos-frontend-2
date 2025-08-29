import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

// Import our configured Axios instance
import API from "./api";

// Import Components
import Home from "./components/home";
import Login from "./components/Login";
import Signup from "./components/Signup";
// A simple loading component can be created
const LoadingSpinner = () => <div style={{textAlign: 'center', marginTop: '50px'}}>Loading...</div>;

function App() {
  // State to hold the authenticated user's data, not just a boolean
  const [user, setUser] = useState(null);
  // Loading state to prevent content flashing while checking auth
  const [loading, setLoading] = useState(true);

  // A function to verify the token and fetch user data
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // The API interceptor will automatically add the token to the header
      const response = await API.get("/api/me");
      // If the request succeeds, the token is valid.
      setUser(response.data);
    } catch (error) {
      // If it fails (e.g., 401 Unauthorized), the token is invalid.
      console.error("Authentication error:", error);
      localStorage.removeItem("token"); // Clean up invalid token
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run token validation once when the app loads
  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // This function is now simpler; it just re-runs validation.
  // Passed to Login and Signup components.
  const handleAuthChange = () => {
    setLoading(true);
    validateToken();
  };

  // Logout handler to be passed to protected components
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };
  
  // While checking the token, show a loading indicator
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Routes>
        {/* Protected Home Route */}
        <Route
          path="/"
          element={
            user ? (
              <Home user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Public Login Route */}
        {/* If user is already logged in, redirect them from login to home */}
        <Route
          path="/login"
          element={
            !user ? (
              <Login onAuthChange={handleAuthChange} />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Public Signup Route */}
        {/* If user is already logged in, redirect them from signup to home */}
        <Route
          path="/signup"
          element={
            !user ? (
              <Signup onAuthChange={handleAuthChange} />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Redirect any other path to the main page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;