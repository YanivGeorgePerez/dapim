require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Set up EJS view engine and views folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Trust proxy if behind Cloudflare or similar.
app.set('trust proxy', 1);

// Set up session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false, // Only create session when needed
  cookie: {
    secure: true,         // ensure HTTPS in production
    sameSite: 'none',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  }
});
app.use(sessionMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// --------------
// In-memory model for demonstration
// --------------

// For simplicity, we'll store pastes and users in memory.
const pastes = []; // Each paste: { id, title, content, user, createdAt, comments: [] }
const users = {};  // Keyed by username, ensures unique names

// Utility to generate a unique ID (use crypto.randomUUID() in Node 16+)
function generateId() {
  return Date.now().toString();
}

// Create a new paste
function createPaste(title, content, user) {
  const paste = {
    id: generateId(),
    title,
    content,
    user,
    createdAt: new Date(),
    comments: [],
    views: [] // Array of IP addresses
  };
  pastes.push(paste);
  return paste;
}

// Get pastes by username
function getPastesByUser(username) {
  return pastes.filter(p => p.user === username).sort((a, b) => b.createdAt - a.createdAt);
}

// Record a view (ensuring no duplicate IP)
function addView(pasteId, ip) {
  const paste = pastes.find(p => p.id === pasteId);
  if (paste && !paste.views.includes(ip)) {
    paste.views.push(ip);
  }
}

// Add comment to a paste
function addComment(pasteId, user, content) {
  const paste = pastes.find(p => p.id === pasteId);
  if (!paste) return null;
  const comment = {
    id: generateId(),
    user,
    content,
    createdAt: new Date()
  };
  paste.comments.push(comment);
  return comment;
}

// --------------
// Routes
// --------------

// Homepage: List recent pastes with search functionality
app.get('/', (req, res) => {
  const query = req.query.q || '';
  let filteredPastes = pastes;
  if (query) {
    filteredPastes = pastes.filter(p =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.content.toLowerCase().includes(query.toLowerCase())
    );
  }
  // Render index.ejs with the list of pastes
  res.render('index', {
    title: 'PasteBin Clone',
    pastes: filteredPastes.sort((a, b) => b.createdAt - a.createdAt),
    query,
    user: req.session.user || null
  });
});

// Create paste page (requires login)
app.get('/create', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('create', { title: 'Create Paste', user: req.session.user });
});

// Handle create paste form submission
app.post('/create', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { title, content } = req.body;
  if (!title || !content || !title.trim() || !content.trim()) {
    return res.status(400).send("Title and content cannot be empty.");
  }
  if (title.length > 100) {
    return res.status(400).send("Title is too long (max 100 characters).");
  }
  if (content.length > 10000) {
    return res.status(400).send("Content is too long (max 10,000 characters).");
  }
  try {
    const paste = createPaste(title.trim(), content.trim(), req.session.user);
    res.redirect(`/paste/${paste.id}`);
  } catch (err) {
    console.error("Error creating paste:", err);
    res.status(500).send("Server error");
  }
});

// Paste view page
app.get('/paste/:id', (req, res) => {
  const paste = pastes.find(p => p.id === req.params.id);
  if (!paste) return res.status(404).send("Paste not found.");
  
  // Record view using Cloudflare header if available
  const clientIp = req.headers['cf-connecting-ip'] || req.ip || 'unknown';
  addView(paste.id, clientIp);
  
  res.render('paste', { title: paste.title, paste, user: req.session.user || null });
});

// Handle comment submission for a paste
app.post('/paste/:id/comment', (req, res) => {
  const paste = pastes.find(p => p.id === req.params.id);
  if (!paste) return res.status(404).send("Paste not found.");
  
  const commentContent = req.body.content;
  if (!commentContent || !commentContent.trim()) {
    return res.status(400).send("Comment cannot be empty.");
  }
  
  const commenter = req.session.user || "Anonymous";
  const comment = addComment(paste.id, commenter, commentContent.trim());
  if (!comment) return res.status(500).send("Error adding comment.");
  
  res.redirect(`/paste/${paste.id}`);
});

// Login routes
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || !username.trim() || !password.trim()) {
    return res.status(400).send("Username and password cannot be empty.");
  }
  // In a real app, verify password hashing, etc.
  // For demo, if username already exists, prevent duplicate registration.
  if (users[username]) {
    // Here, assume login if user exists (ignore password for demo purposes)
    req.session.user = username;
    return res.redirect('/');
  } else {
    return res.status(400).send("User not found. Please register first.");
  }
});

// Registration routes
app.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || !username.trim() || !password.trim()) {
    return res.status(400).send("Username and password cannot be empty.");
  }
  if (users[username]) {
    return res.status(400).send("Username already exists.");
  }
  // In production, hash the password before storing.
  users[username] = { username, password, createdAt: new Date() };
  // Log the user in immediately
  req.session.user = username;
  res.redirect('/');
});

// Profile routes
// /profile returns the current logged-in user's profile
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userPastes = getPastesByUser(req.session.user);
  res.render('profile', {
    title: `${req.session.user}'s Profile`,
    profileUser: req.session.user,
    pastes: userPastes,
    user: req.session.user
  });
});

// /profile/:name returns the profile for a given username
app.get('/profile/:name', (req, res) => {
  const profileUser = req.params.name;
  // Ensure the username exists in our in-memory users model
  if (!users[profileUser]) return res.status(404).send("User not found.");
  const userPastes = getPastesByUser(profileUser);
  res.render('profile', {
    title: `${profileUser}'s Profile`,
    profileUser,
    pastes: userPastes,
    user: req.session.user || null
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.redirect('/');
  });
});

// Fallback route for undefined endpoints
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
