const router = require('express').Router();
const User = require('../models/User');
const bcrypt  = require('bcryptjs');
require('dotenv/config');
const jwt = require('jsonwebtoken');

router.post('/api/signup', async (req, res) => {
    //Check if the user is already in the db
    const emailExists = await User.findOne({Email:req.body.Email});
    if(emailExists){
        return res.status(400).send('Email already exists')
    }

    //Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.Password, salt);

    const user = new User({
        Username: req.body.Username,
        Email: req.body.Email,
        Password: hashedPassword
    });
    try{
        const savedUser = await user.save();

        //Create and assign a token
        const token = jwt.sign({
            _id: savedUser._id
        }, process.env.TOKEN_SECRET);
        // res.header('auth-token', token).send(token);

        res.send({UserId: savedUser._id, Token: token});
    }
    catch(err){
        res.status(400).send(err);
    }
});

router.post('/api/login', async (req, res) => {
    //Check if the user is in the db
    const user = await User.findOne({Email:req.body.Email});
    if(!user){
        return res.status(400).send('Invalid email or password')
    }

    //Check the password
    const validPass = await bcrypt.compare(req.body.Password, user.Password);
    if(!validPass){
        return res.status(400).send('Invalid email or password');
    }

    //Create and assign a token
    const token = jwt.sign({
        _id: user._id
    }, process.env.TOKEN_SECRET);
    // res.header('auth-token', token).send(token);

    res.send({UserId: user._id, Token: token});
    // res.send('logged in')
});



module.exports = router;