import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    api.post("/auth/login", { username, password })
      .then((res) => {
        localStorage.setItem("pw_token", res.data.token);
        navigate("/");
      })
      .catch((err) => {
        if (err.response?.status === 401) setError("Wrong username or password");
        else setError("Cannot reach the backend. Is it running?");
      });
  };

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h2>Pointwise</h2>
        <p className="muted">Admin login</p>
        <input placeholder="Username" value={username}
               onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input type="password" placeholder="Password" value={password}
               onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}