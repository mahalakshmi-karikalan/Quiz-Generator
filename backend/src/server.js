require('dotenv').config();
const express = require('express');
const uploadRouter = require('./routes/upload');
const generateQuizRouter = require('./routes/generateQuiz');
const authRouter = require('./routes/auth');

const app = express();
app.use(express.static('public'));
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.json({
        message: 'Quiz Generator API',
        endpoints: {
            health: '/health',
            upload: '/upload/file',
            generateQuiz: '/api/generate-quiz'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({status: 'ok', timestamp: Date.now()});
});

app.use('/upload', uploadRouter);
app.use('/api/generate-quiz', express.json(), generateQuizRouter);

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; font-src 'self' data:;");
    next();
});

// Improved error handling middleware
app.use((err, req, res, next) => {
    console.error('=== ERROR DETAILS ===');
    console.error('Time:', new Date().toISOString());
    console.error('URL:', req.url);
    console.error('Method:', req.method);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Request body:', req.body);
    console.error('=====================');
    
    res.status(500).json({
        error: 'Internal server error',
        message: err.message, 
        timestamp: Date.now()
    });
});

app.use('/auth', express.json(), authRouter);



app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log('Environment check:');
    console.log('- HF_TOKEN:', process.env.HF_TOKEN ? 'Set' : 'Missing');
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
});