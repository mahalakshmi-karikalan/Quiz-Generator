'use strict';
module.exports = (sequelize, DataTypes) => {
  const Quiz = sequelize.define('Quiz', {
    questions: { 
      type: DataTypes.JSON, // Changed from JSONB to JSON for SQLite compatibility
      allowNull: false 
    }
  }, {
    tableName: 'quizzes',
    underscored: true,
  });

  Quiz.associate = (models) => {
    Quiz.belongsTo(models.Document, { 
      foreignKey: 'document_id', 
      as: 'document' 
    });
  };

  return Quiz;
};