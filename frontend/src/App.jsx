import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ title: '', description: '', image: null });
  const [uploading, setUploading] = useState(false);
  
  const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: auth ? { Authorization: `Basic ${auth.token}` } : {}
  });

  useEffect(() => {
    if (auth) {
      fetchItems();
    }
  }, [auth]);

  const fetchItems = async () => {
    try {
      const res = await axiosInstance.get('/items');
      setItems(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    const token = btoa(`${username}:${password}`);
    
    try {
      if (isRegistering) {
        await axios.post(`${API_URL}/register`, { username, password });
        setIsRegistering(false);
        setError('Registered successfully, please log in.');
      } else {
        const res = await axios.get(`${API_URL}/login`, {
          headers: { Authorization: `Basic ${token}` }
        });
        const authData = { token, username: res.data.username };
        setAuth(authData);
        localStorage.setItem('auth', JSON.stringify(authData));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('auth');
    setItems([]);
  };

  const handleImageChange = (e) => {
    setNewItem({ ...newItem, image: e.target.files[0] });
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItem.title) return setError('Title is required');
    setUploading(true);
    setError('');
    
    try {
      let image_url = null;
      if (newItem.image) {
        const formData = new FormData();
        formData.append('image', newItem.image);
        const uploadRes = await axiosInstance.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        image_url = uploadRes.data.image_url;
      }
      
      const itemRes = await axiosInstance.post('/items', {
        title: newItem.title,
        description: newItem.description,
        image_url
      });
      
      setItems([itemRes.data, ...items]);
      setNewItem({ title: '', description: '', image: null });
    } catch (err) {
      setError('Failed to create item');
    } finally {
      setUploading(false);
    }
  };

  if (!auth) {
    return (
      <div className="app-container">
        <div className="header">
          <h1>Fullstack Portal</h1>
          <p>Azure AKS Demo Application</p>
        </div>
        <div className="glass-panel login-form">
          <h2 style={{marginTop: 0, textAlign: 'center'}}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleAuth}>
            <div className="input-group">
              <label>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
            <div className="input-group" style={{marginTop: '1rem', marginBottom: '1.5rem'}}>
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" style={{width: '100%'}}>
              {isRegistering ? 'Register' : 'Sign In'}
            </button>
          </form>
          <div style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem'}}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setIsRegistering(!isRegistering); setError(''); }}
              style={{color: 'var(--secondary-color)', textDecoration: 'none'}}
            >
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container dashboard">
      <div className="dashboard-header glass-panel">
        <div>
          <h1 style={{margin: 0}}>Dashboard</h1>
          <p style={{margin: 0, color: '#cbd5e1'}}>Welcome, {auth.username}</p>
        </div>
        <button onClick={handleLogout}>Sign Out</button>
      </div>

      <div className="grid">
        <div className="glass-panel" style={{height: 'fit-content'}}>
          <h2 style={{marginTop: 0}}>Add New Item</h2>
          {error && <div className="error-msg" style={{marginBottom: '1rem'}}>{error}</div>}
          <form onSubmit={handleCreateItem}>
            <div className="input-group" style={{marginBottom: '1rem'}}>
              <label>Title</label>
              <input 
                type="text" 
                value={newItem.title} 
                onChange={e => setNewItem({...newItem, title: e.target.value})} 
                required 
              />
            </div>
            <div className="input-group" style={{marginBottom: '1rem'}}>
              <label>Description</label>
              <textarea 
                rows="3" 
                value={newItem.description} 
                onChange={e => setNewItem({...newItem, description: e.target.value})} 
              />
            </div>
            <div className="input-group" style={{marginBottom: '1.5rem'}}>
              <label>Upload Image (Blob Storage)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                style={{padding: '0.5rem'}}
              />
            </div>
            <button type="submit" disabled={uploading} style={{width: '100%'}}>
              {uploading ? 'Uploading...' : 'Create Item'}
            </button>
          </form>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          {items.map(item => (
            <div key={item.id} className="glass-panel item-card">
              {item.image_url && (
                <img src={item.image_url} alt={item.title} className="item-image" />
              )}
              <h3 style={{margin: '0 0 0.5rem 0'}}>{item.title}</h3>
              <p style={{margin: 0, color: '#e2e8f0', lineHeight: 1.5}}>{item.description}</p>
              <small style={{color: '#94a3b8'}}>
                {new Date(item.created_at).toLocaleString()}
              </small>
            </div>
          ))}
          {items.length === 0 && (
            <div className="glass-panel" style={{textAlign: 'center', padding: '3rem 2rem'}}>
              <h3 style={{color: '#94a3b8', margin: 0}}>No items yet</h3>
              <p style={{color: '#64748b'}}>Create your first item using the form.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
