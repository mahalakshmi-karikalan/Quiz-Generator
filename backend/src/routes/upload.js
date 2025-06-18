const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

// Debug: Check if models directory exists
const modelsPath = path.join(__dirname, '../models');
console.log('Looking for models at:', modelsPath);
console.log('Models directory exists:', fs.existsSync(modelsPath));
console.log('Current directory:', __dirname);
console.log('Contents of src directory:', fs.readdirSync(path.join(__dirname, '..')));

// Try to require models with error handling
let Document;
try {
  const models = require('../models');
  console.log('Models loaded successfully:', Object.keys(models));
  Document = models.Document;
} catch (error) {
  console.error('Failed to load models:', error.message);
  console.error('Error code:', error.code);
  
  // Alternative: try direct path
  try {
    const models = require('../models/index.js');
    console.log('Models loaded with explicit index.js:', Object.keys(models));
    Document = models.Document;
  } catch (error2) {
    console.error('Also failed with explicit index.js:', error2.message);
  }
}

const {parseDocument} = require("../utils/parser");
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); 
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `quizdoc-${timestamp}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
        return cb(new Error('Unsupported file type'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 
    }
});

// Combined authenticated file upload route
router.post('/file', authMiddleware, upload.single('document'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({error: 'No file uploaded'});
        }

        const filePath = req.file.path;
        const rawText = await parseDocument(filePath);
        const wordCount = rawText.split(/\s+/).filter(word => word.length > 0).length;
        
        // Save parsed text as a separate file
        const textFileName = req.file.filename.replace(path.extname(req.file.filename), '.txt');
        const textFilePath = path.join(uploadsDir, textFileName);
        await fsPromises.writeFile(textFilePath, rawText, 'utf8');
        
        // Only try to save to database if Document model is available
        let document;
        if (Document) {
            document = await Document.create({
                owner_id: req.userId, // From authMiddleware
                filename: req.file.originalname,
                parsedText: rawText,
                wordCount: wordCount
            });
        }
        
        console.log(`Parsed ${req.file.filename}: ${wordCount} words for user ${req.userId}`);

        return res.json({
            message: 'Upload & parse successful',
            documentId: document ? document.id : null,
            originalFile: req.file.filename,
            textFile: textFileName,
            wordCount,
            preview: rawText.substring(0, 300) + (rawText.length > 300 ? '...' : '')
        });

    } catch (err) {
        console.error('Upload/parse error:', err);
        next(err);
    }
});

// Add route to get full parsed content
router.get('/text/:filename', async (req, res) => {
    try {
        const textFileName = req.params.filename;
        const textFilePath = path.join(uploadsDir, textFileName);
        
        if (!fs.existsSync(textFilePath)) {
            return res.status(404).json({error: 'Text file not found'});
        }
        
        const content = await fsPromises.readFile(textFilePath, 'utf8');
        res.json({
            filename: textFileName,
            content: content,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length
        });
        
    } catch (error) {
        console.error('Error reading text file:', error);
        res.status(500).json({error: 'Failed to read text file'});
    }
});

// Get user's documents
router.get('/documents', authMiddleware, async (req, res, next) => {
    try {
        if (!Document) {
            return res.status(500).json({error: 'Database models not available'});
        }
        
        const documents = await Document.findAll({
            where: { owner_id: req.userId },
            order: [['createdAt', 'DESC']]
        });
        
        res.json({ documents });
    } catch (err) {
        next(err);
    }
});

// Add route to clean up old files (optional)
router.delete('/cleanup', async (req, res) => {
    try {
        const files = await fsPromises.readdir(uploadsDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fsPromises.stat(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                await fsPromises.unlink(filePath);
                console.log(`Deleted old file: ${file}`);
            }
        }
        
        res.json({message: 'Cleanup completed'});
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({error: 'Cleanup failed'});
    }
});

module.exports = router;