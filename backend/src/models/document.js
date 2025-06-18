'use strict';
module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    filename: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    parsedText: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    wordCount: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
  }, {
    tableName: 'documents',
    underscored: true,
  });

  Document.associate = (models) => {
    Document.belongsTo(models.User, { 
      foreignKey: 'owner_id', 
      as: 'owner' 
    });
    Document.hasMany(models.Quiz, { 
      foreignKey: 'document_id', 
      as: 'quizzes' 
    });
  };

  return Document;
};