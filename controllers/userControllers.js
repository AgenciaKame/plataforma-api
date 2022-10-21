const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

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
    res
      .status(201)
      .json({ message: `Nuevo usuario ${name} ${lastName} creado` });
  } else {
    res.status(400).json({ message: "Los datos recibidos son invalidos" });
  }
});

//@desc receive a email and send a message
//@toute POST /changePassword
//access PUBLIC

const sendEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).lean().exec();

  if (!user) {
    return res
      .status(400)
      .json({ message: "El email ingresado no es correcto" });
  }

  const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

  async function sendMail() {
    try {
      const accessToken = await oAuth2Client.getAccessToken();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: "hola@agenciakame.com",
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });
      const mailOption = {
        from: "Agencia Kame <hola@agenciakame.com>",
        to: email,
        subject: "Cambio de Contraseña",
        html: `
          <p>Hola ${user.name}.</p>
          <p>Para crear tu nueva contraseña haz    
            <a href='https://agenciakame.onrender.com/cambiodeclave/${user._id}'>
              clic aqui
            </a>
            . Recuerda que la contraseña debe contener al menos <strong>5 caracteres</strong> entre letras y números.
          </p>
          <p>Ante cualquier inconveniente puedes responderme a esta misma dirección.</p>
          <br>
          <p>Saludos.</p>
          <p>Agencia Kame.</p>
        `,
      }; /* http://localhost:3000/ */ /* https://agenciakame.onrender.com */

      const result = await transporter.sendMail(mailOption);
      return result;
    } catch (err) {
      console.log(err);
    }
  }
  sendMail()
    .then((result) => console.log("message sent"))
    .catch((error) => console.log(error.message));
  res.json({ message: "done" });
});

//@desc change and confirm password
//@route POST /changeAndConfirmPassword
//access PUBLIC

const changePassword = asyncHandler(async (req, res) => {

  const { id, password, confirmPassword } = req.body;
  const user = await User.findById(id).exec();

  if (!user) {
    res.status(400).json({ message: "Usuario no encontrado" });
  }

  if (password !== confirmPassword) {
    res.status(401).json({ message: "Las contraseñas no coinciden" });
  }

  user.password = await bcrypt.hash(password, 10);
  const updatedUser = await user.save();

  res.json({
    message: `La contraseña de ${updatedUser.name} ${updateUser.lastName} ha sido actualizada`,
  });
});

//@desc update a user
//@route PATCH /users
//@access PRIVATE
const updateUser = asyncHandler(async (req, res) => {
  const { id, email, roles, password } = req.body;

  //confirm data
  if (!id || !email || !Array.isArray(roles) || !roles.length) {
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

  res.json({ message: `${updatedUser.email} actualizado` });
});

//@desc delete a user
//@route DELETE /users
//@access PRIVATE
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: "Usuario no encontrado" });
  }

  const result = await user.deleteOne();

  const reply = `email ${result.email} con ID ${result._id} eliminado`;

  res.json(reply);
});

module.exports = {
  getAllUsers,
  createNewUser,
  sendEmail,
  changePassword,
  updateUser,
  deleteUser,
};
