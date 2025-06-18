const express = require('express');
const router = express.Router();
const { generateQuiz } = require('../utils/quizGenerator');

const { Document, Quiz } = require('../models');

router.post('/', async (req, res, next) => {
  try {
    const { text, documentId } = req.body;
    const quizData = await generateQuiz(text);

 
    const quiz = await Quiz.create({
      document_id: documentId,
      questions:   quizData
    });

    res.json({ quiz });
  } catch (err) {
    next(err);
  }
});


module.exports = router;