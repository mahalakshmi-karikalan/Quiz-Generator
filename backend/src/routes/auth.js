const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

router.post('/signup', async(req,res,next)=>{
    try {
        const{email,password}= req.body;
        if(!email||!password||password.length < 6){
            return res.status(400).json({error: 'Invalid email or password'});
        }
        const existing = await User.findOne({where: {email}});
        if(existing){
            return res.status(409).json({error: 'Email already in use'});
        }
        const passwordHash= await bcrypt.hash(password,10);
        const user = await User.create({email,passwordHash});

        const token = jwt.sign({userId:user.id}, JWT_SECRET,{expiresIn: '7d'});
        res.status(201).json({token});
        
    } catch (error) {
        next(error)
        
    }
})

router.post('/login', async(req,res,next) =>{
    try{
        const{email,password} = req.body;
        const user = await User.findOne({where: {email}});
        if(!user){
            return res.status(401).json({error: 'Invalid credentials'});

        }    
        const valid = await bcrypt.compare(password, user.passwordHash);
        if(!valid){
            return res.status(401).json({error: 'Invalid credentials'});
        }
        const token  = jwt.sign({userId: user.id},JWT_SECRET, {expiresIn:'7d'}); // Fixed typo
        res.json({token});

    }catch(err){
        next(err);
    }
})

module.exports = router;