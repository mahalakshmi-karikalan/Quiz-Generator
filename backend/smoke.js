const { User, Document, Quiz, sequelize } = require('./src/models');

async function smoke() {
  await sequelize.sync();
  
  
  await User.destroy({ where: { email: 'a@b.com' } });
  
  const user = await User.create({ email:'a@b.com', passwordHash:'xxx' });
  const doc = await Document.create({
    owner_id: user.id,
    filename: 'test.pdf',
    parsedText: 'Hello world',  
    wordCount: 2               
  });
  const quiz = await Quiz.create({
    document_id: doc.id,
    questions: [{ question:'Q?', options:['A','B'], answer:'A' }]
  });
  console.log('Saved quiz:', quiz.toJSON());
  process.exit();
}
smoke();