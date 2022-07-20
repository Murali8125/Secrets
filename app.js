//jshint esversion:6

require('dotenv').config()
const express=require('express')
const bodyParser=require('body-parser')
const mongoose=require('mongoose')
const app=express();
const session = require('express-session')
const passport=require("passport")
const passportLocalMongoose=require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy
var findOrCreate = require('mongoose-findorcreate')
app.use(express.static("public"))
app.set('view engine','ejs')
app.use(express.json())

app.use(session({
    secret:"laisjdgasdsga",
    resave:false,
    saveUninitialized:false,
}))

app.use(passport.initialize());
app.use(passport.session())
mongoose.connect(process.env.MONGO_URL)

var userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});


userSchema.plugin(passportLocalMongoose)

userSchema.plugin(findOrCreate)

const User=new mongoose.model("User",userSchema)

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id); 
   // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile)
    User.findOrCreate({ username: profile.emails[0].value,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res)
{
    res.render("home")
})


app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile","email"] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get("/login",function(req,res)
{
    res.render("login")
})
app.get("/secrets",function(req,res){
    // if(req.isAuthenticated()){
    //     res.render("secrets")
    // }else{
    //     res.redirect("/login")
    // }
    User.find({secret:{$ne:null}},function(err,foundUSer){

        if(err){
            console.log(err)
        }
        else{
            if(foundUSer){
                console.log(foundUSer)
                res.render("secrets",{usersWithSecrets:foundUSer})
            }
        }
    })
})
app.get("/register",function(req,res)
{
    res.render("register")
})
app.listen(process.env.PORT||3000,function()
{
    console.log("server started")
})
app.post("/register",function(req,res)
{
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err)
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
    
    })
    
})
app.get("/logout",function(req,res){
    req.logOut();
    res.redirect("/")
})
app.get("/submit",function(req,res)
{
    if(req.isAuthenticated()){
        res.render("submit")
    }
    else{
        res.redirect("login")
    }
})
app.post("/login",function(req,res){
    const user=new User({
        username:req.body.username,
        password:req.body.password
    })
    req.logIn(user,function(err){
        if(!err){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
        else
        {
            res.render("notregistered")
        }
    })
})
app.post("/submit",function(req,res){
    const submittedsecret=req.body.secret
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err)
        }
        else{
            if(foundUser){
                foundUser.secret=submittedsecret
                foundUser.save(function(){
                    res.redirect("/secrets")
                })
            }
        }
    })
    
})

