const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

//@desc Get all users
//@route GET /users
//@access PRIVATE
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").lean();
  if (!users.length) {
    return res.status(400).json({ message: "No se han encontrado usuarios" });
  }
  res.json(users);
});

//@desc Create new user
//@route POST /users
//@access PRIVATE
const createNewUser = asyncHandler(async (req, res) => {
  const { name, lastName, email, password, confirmPassword, roles } = req.body;

  //Confirm data
  if (
    !name ||
    !lastName ||
    !email ||
    !password ||
    !confirmPassword ||
    !Array.isArray(roles) ||
    !roles.length
  ) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  //Check for duplicates
  const duplicate = await User.findOne({ email }).lean().exec();
  if (duplicate) {
    return res.status(409).json({ message: "El email ya existe" });
  }
  //Check the passwords match
  if (password != confirmPassword) {
    return res.status(400).json({ message: "Las contraseñas no coinciden" });
  }

  //Hash the password
  const hashedPassword = await bcrypt.hash(password, 10); //salt rounds

  const userObject = { name, lastName, email, password: hashedPassword, roles };

  //Create and store new user
  const user = await User.create(userObject);

  if (user) {
    //created
    res.status(201).json({ message: `Nuevo usuario ${name} ${lastName} creado` });
  } else {
    res.status(400).json({ message: "Los datos recibidos son invalidos" });
  }
});

//@desc update a user
//@route PATCH /users
//@access PRIVATE
const updateUser = asyncHandler(async (req, res) => {
  const { id, email, roles, password } = req.body;

  //confirm data
  if (
    !id ||
    !email ||
    !Array.isArray(roles) ||
    !roles.length
  ) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    res.status(400).json({ message: "Usuario no encontrado" });
  }

  //Check for duplicate
  const duplicate = await User.findOne({ email }).lean().exec();
  //Allow updates to the original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "El usuario ya existe" });
  }

  user.email = email;
  user.roles = roles;

  if (password) {
    //Hash password
    user.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = await user.save();

  res.json({ message: `${updateUser.email} actualizado` });
});

//@desc delete a user
//@route DELETE /users
//@access PRIVATE
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body

  if(!id) {
    return res.status(400).json({ message: 'User ID is required'})
  }

  const user = await User.findById(id).exec()

  if (!user) {
    return res.status(400).json({ message: 'Usuario no encontrado'})
  }

  const result = await user.deleteOne()

  const reply = `email ${result.email} con ID ${result._id} eliminado`

  res.json(reply)
});

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
