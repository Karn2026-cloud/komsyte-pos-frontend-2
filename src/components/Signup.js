import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from '../api'; // ✅ IMPORT THE CENTRAL API CLIENT

function Signup({ onAuthChange }) {
  const [formData, setFormData] = useState({ shopName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // ✅ USE THE API CLIENT, NOT FETCH
      const response = await API.post("/api/signup", formData);
      localStorage.setItem("token", response.data.token);
      if (onAuthChange) onAuthChange();
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ... (keep your entire return and styles section exactly as it was)
   return (
    <div style={styles.container}>
        <h2 style={styles.title}>Create Your Shop</h2>
        <form onSubmit={handleSignup}>
            <div style={styles.inputGroup}>
                <label htmlFor="shopName" style={styles.label}>Shop Name</label>
                <input id="shopName" name="shopName" placeholder="Shop Name" value={formData.shopName} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
                <label htmlFor="email" style={styles.label}>Email</label>
                <input id="email" name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.inputGroup}>
                <label htmlFor="password" style={styles.label}>Password</label>
                <input id="password" name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required style={styles.input} />
            </div>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
        </form>
        {error && <p style={styles.errorText}>{error}</p>}
        <p style={styles.footerText}>
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>
              Login here
            </Link>
        </p>
    </div>
  );
}


// --- Styles ---
const styles = {
    container: {
    maxWidth: 400,
    margin: "50px auto",
    padding: 20,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
   label: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
  input: {
    width: "100%",
    padding: 10,
    boxSizing: 'border-box',
    borderRadius: 4,
    border: '1px solid #ccc'
  },
  button: {
    width: "100%",
    padding: 12,
    background: "#28a745",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 16,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
  },
  footerText: {
    textAlign: "center",
    marginTop: 15,
  },
  link: {
    color: "#007bff",
    textDecoration: "none",
  },
};

export default Signup;

