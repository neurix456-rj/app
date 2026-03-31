import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

dotenv.config();

const app = express();

/* CORS FIX */
app.use(cors({
  origin: "*"
}));

app.use(express.json());

/* DB */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

/* MODELS */
const User = mongoose.model("User", new mongoose.Schema({
  name:String,
  email:String,
  password:String
}));

const Task = mongoose.model("Task", new mongoose.Schema({
  title:String,
  description:String,
  budget:Number,
  userId:mongoose.Schema.Types.ObjectId
}));

/* AUTH */
const protect = (req,res,next)=>{
  const token = req.headers.authorization;
  if(!token) return next();

  try{
    const decoded = jwt.verify(token,process.env.JWT_SECRET);
    req.user = decoded;
  }catch{}
  next();
};

/* AI */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* COMMISSION */
const calculateCommission = (amount)=>{
  const rate = process.env.COMMISSION_RATE || 10;
  const commission = (amount*rate)/100;

  return {
    total:amount,
    commission,
    expertAmount:amount-commission
  };
};

/* ROUTES */

app.get("/",(req,res)=>{
  res.send("NeuriX API Running 🚀");
});

/* REGISTER */
app.post("/api/register", async(req,res)=>{
  const {name,email,password} = req.body;

  const hash = await bcrypt.hash(password,10);

  const user = await User.create({name,email,password:hash});
  res.json(user);
});

/* LOGIN */
app.post("/api/login", async(req,res)=>{
  const {email,password} = req.body;

  const user = await User.findOne({email});
  if(!user) return res.json({msg:"User not found"});

  const match = await bcrypt.compare(password,user.password);
  if(!match) return res.json({msg:"Wrong password"});

  const token = jwt.sign({id:user._id},process.env.JWT_SECRET);

  res.json({user,token});
});

/* AI */
app.post("/api/ai", async(req,res)=>{
  try{
    const {text} = req.body;

    const response = await openai.chat.completions.create({
      model:"gpt-4o-mini",
      messages:[
        {role:"system",content:"Classify into web, app, design, education"},
        {role:"user",content:text}
      ]
    });

    res.json({result:response.choices[0].message.content});
  }catch{
    res.json({result:"AI Error"});
  }
});

/* TASK */
app.post("/api/task", protect, async(req,res)=>{
  const task = await Task.create({
    ...req.body,
    userId:req.user?.id || null
  });

  res.json(task);
});

/* COMMISSION */
app.post("/api/commission",(req,res)=>{
  const amount = Number(req.body.amount || 0);
  res.json(calculateCommission(amount));
});

/* START */
app.listen(process.env.PORT || 5000, ()=>{
  console.log("Server Running 💀");
});