import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import authRoutes from './routes/auth.js';
import repoRoutes from "./routes/repositoryRoutes.js";
import cors from 'cors';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use("/repositories", repoRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the GitHub OAuth Authentication App');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});