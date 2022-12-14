const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  lastName: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
  roles: [
    {
      type: String,
      default: "Curso 1",
    },
  ],
  date: {
    type: String,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema)