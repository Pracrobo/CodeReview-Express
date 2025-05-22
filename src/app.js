import express from 'express';
import authRoutes from './routes/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the GitHub OAuth Authentication App');
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});