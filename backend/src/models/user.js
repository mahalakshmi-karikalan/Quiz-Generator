'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    passwordHash: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
  }, {
    tableName: 'users',
    underscored: true,
  });

  User.associate = (models) => {
    User.hasMany(models.Document, { 
      foreignKey: 'owner_id', 
      as: 'documents' 
    });
  };

  return User;
};