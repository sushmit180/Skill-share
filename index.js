const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const User = require("./models/skill.js"); 

// mogodb se connection
mongoose.connect("mongodb://127.0.0.1:27017/PROJECT")
  .then(() => console.log("MongoDB connection successful"))
  .catch(err => console.log("MongoDB error:", err));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// configurinf session
const sessionOptions = {
  secret: "myskillmatchsecret",
  resave: false,
  saveUninitialized: false
};
app.use(session(sessionOptions));

// intisialise passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.listen(8080, () => {
  console.log("Server listening on port 8080");
});
app.get("/",(req,res)=>{
    res.render("login.ejs");
})
app.post("/",passport.authenticate('local',{failureRedirect:'/signup'}),async(req,res)=>{
    await res.redirect("http://localhost:8080/home");
})
app.get("/signup",(req,res)=>{
    res.render("signup.ejs");
})
app.post("/signup",async(req,res)=>{
    let{username,password,email,skillsTeach,skillsLearn}=req.body;
    const newuser=new User({username,email,skillsTeach,skillsLearn});
    const registereduser=await User.register(newuser,password);
    res.redirect("/home");
})
app.get("/home", async(req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }
   const populatedUser = await User.findById(req.user._id).populate("matches"); // req.user will transfer user data
   res.render("home.ejs", { user: populatedUser });
});
app.get("/home/add/:id",async(req,res)=>{
    let {id}=req.params;
    res.render("add.ejs",{id});
})
app.post("/home/add/:id",async(req,res)=>{
    let{id}=req.params;
    let skill=req.body.newskill;
    let thisuser=await User.findById(id);
    thisuser.skillsTeach.push(skill);
    await thisuser.save();
    res.redirect("/home");
})
app.get("/home/find/:id", async (req, res) => {
  let { id } = req.params;
  const currentUser = await User.findById(id);
 // potential matches find karenge
  const matches = await User.find({
    _id: { $ne: currentUser._id }, // not take itself
    skillsTeach: { $in: currentUser.skillsLearn }, // barter
    skillsLearn: { $in: currentUser.skillsTeach }  // they want to learn what I can teach
  });

  res.render("find.ejs", { currentUser, matches });
});
app.post("/home/request/:receiverId", async (req, res) => {
  const { receiverId } = req.params;
  const { senderId } = req.body;

  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);

 // dont take duplicates
  if (!sender.sentRequests.includes(receiverId)) {
    sender.sentRequests.push(receiverId);
  }

  if (!receiver.receivedRequests.includes(senderId)) {
    receiver.receivedRequests.push(senderId);
  }

  await sender.save();
  await receiver.save();

  res.redirect(`/home/find/${senderId}`);
});
app.get("/home/notification/:id",async(req,res)=>{
    let{id}=req.params;
    const currentUser = await User.findById(id).populate("receivedRequests");
    res.render("notification.ejs",{currentUser});
})
app.post("/home/accept/:receiverId/:senderId", async (req, res) => {
  const { receiverId, senderId } = req.params;

  const receiver = await User.findById(receiverId);
  const sender = await User.findById(senderId);

  if (!receiver.matches.includes(senderId)) {
    receiver.matches.push(senderId);
  }
  if (!sender.matches.includes(receiverId)) {
    sender.matches.push(receiverId);
  }
  receiver.receivedRequests = receiver.receivedRequests.filter(id => id.toString() !== senderId);
  sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== receiverId);

  await receiver.save();
  await sender.save();

  res.redirect(`/home/notification/${receiverId}`);
});
app.post("/home/reject/:receiverId/:senderId", async (req, res) => {
  const { receiverId, senderId } = req.params;

  const receiver = await User.findById(receiverId);

  receiver.receivedRequests = receiver.receivedRequests.filter(id => id.toString() !== senderId);

  await receiver.save();

  res.redirect(`/home/notification/${receiverId}`);
});

