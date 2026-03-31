import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

/* MIDDLEWARE */
app.use(cors({ origin: "*" }));
app.use(express.json());

/* DB CONNECT */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected ✅"))
.catch(err=>console.log(err));

/* MODELS */

/* TASK */
const Task = mongoose.model("Task", new mongoose.Schema({
  title:String,
  description:String,
  budget:Number,
  status:{ type:String, default:"pending" },
  paid:{ type:Boolean, default:false },
  createdAt:{ type:Date, default:Date.now }
}));

/* PAYMENT (MANUAL VERIFY) */
const Payment = mongoose.model("Payment", new mongoose.Schema({
  amount:Number,
  screenshot:String, // optional future
  status:{ type:String, default:"pending" },
  createdAt:{ type:Date, default:Date.now }
}));

/* AI */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* COMMISSION FUNCTION */
const COMMISSION_RATE = process.env.COMMISSION_RATE || 16;

function calculateCommission(amount){
  const commission = (amount * COMMISSION_RATE)/100;
  return {
    total: amount,
    commission,
    expertAmount: amount - commission
  };
}

/* ROUTES */

/* TEST */
app.get("/",(req,res)=>{
  res.send("NeuriX Backend Running 🚀");
});

/* CREATE TASK */
app.post("/api/task", async(req,res)=>{
  try{
    const task = await Task.create(req.body);
    res.json(task);
  }catch{
    res.json({msg:"Task error"});
  }
});

/* GET TASKS */
app.get("/api/tasks", async(req,res)=>{
  const tasks = await Task.find().sort({createdAt:-1});
  res.json(tasks);
});

/* COMMISSION */
app.post("/api/commission",(req,res)=>{
  const amount = Number(req.body.amount || 0);
  res.json(calculateCommission(amount));
});

/* PAYMENT MARK (USER CLICK "I PAID") */
app.post("/api/payment", async(req,res)=>{
  try{
    const {amount} = req.body;

    const payment = await Payment.create({
      amount,
      status:"pending"
    });

    res.json({
      msg:"Payment recorded (manual verify)",
      payment
    });
  }catch{
    res.json({msg:"Payment error"});
  }
});

/* VERIFY PAYMENT (ADMIN USE) */
app.post("/api/verify/:id", async(req,res)=>{
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    {status:"verified"},
    {new:true}
  );

  res.json(payment);
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
    res.json({result:"AI error"});
  }
});

/* START */
app.listen(process.env.PORT || 5000, ()=>{
  console.log("Server Running 💀");
});
