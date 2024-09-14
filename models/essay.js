'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Essay extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Essay.init({
    user: DataTypes.STRING,
    room: DataTypes.STRING,
    essay: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Essay',
  });
  return Essay;
};