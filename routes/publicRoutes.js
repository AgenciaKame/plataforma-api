const express = require('express')
const router = express.Router()
const userControllers = require('../controllers/userControllers')

router.route('/')
  .post(userControllers.sendEmail)

router.route('/confirm')
  .post(userControllers.changePassword)

module.exports = router