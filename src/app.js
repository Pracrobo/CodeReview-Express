import express from 'express';
import session from 'express-session';
import passport from 'passport';
import authRoutes from './routes/auth.js';
import './config/passport.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the GitHub OAuth Authentication App');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});