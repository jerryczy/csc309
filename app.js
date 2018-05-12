/*jshint esversion: 6 */ 
const express = require('express');
const html = require('html');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var crypto = require('crypto');

const app = express();
var uri = "mongodb://a3:1234@ds153752.mlab.com:53752/wtdb";
// Read responses in a parsed way
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
	secret: 'unilife', 
	resave: false,
	saveUninitialized: true
}));


// Set where to look for templates
app.set('views', __dirname + '/views');
// Set what we are rendering views with
app.set('view engine', 'ejs');

// Set where we look for static files
app.use(express.static(__dirname + '/views/js'));

// By default, send them to our index page
app.get('/', function(req, res){
	res.render('index.ejs');
});

app.post('/login/', function(req, res) {
	if (req.session.user) { res.status(500).send("Already logged in.");}
	else{
		// console.log(req.body);
		var user1 = req.body.username;
		var pass1 = req.body.password;
		MongoClient.connect(uri, function(err, client) {
			if (!user1) {
				client.close();
				return res.status(500).send("Please enter the username.");
			}
			if (!pass1) {
				client.close();
				return res.status(500).send("Please enter the password.");
			}
			if (err) {
				console.log(err);
			}
			var db = client.db("wtdb");
			var salt;
			var newpwd;
			db.collection("users").findOne({username:user1}, function(error, result) {
				if (result){
					salt = result.salt;
					newpwd = cryptPwd(pass1,salt);
						
					db.collection("users").findOne({$and: [{username: user1}, {password: newpwd}]}, function(error, result) {
						//if username and password is correct
						if (result) {
							console.log("log in success");
							req.session.user = result;
							res.status(200).send("successful");
							client.close();
						}
						else {
							db.collection("users").findOne({username:user1}, function(error2, result2) {
								if (result2) {
									res.status(500).send("Invalid password!");
									client.close();
								}
								else {
									console.log(error2);
								}
							});
						}
					});
				} else {
					res.status(500).send("Invalid username!");
					client.close();
				}
			});
		});
	}
});

// See the front end's username and password
app.post('/signup/', function(req, res){
	// req.body is the json
	// username:username
	// password:password
	// console.log(req.body);
	if(!req.body.username){
		return res.status(500).send("Username cannot be empty.");

	}
	else if(!req.body.password){
		return res.status(500).send("Password cannot be empty.");
	}
	else{
		var salt = getRandomSalt();
		req.body['password'] = cryptPwd(req.body.password,salt);
		req.body['salt'] = salt;
		req.body['saved'] = [];

		var user = req.body.username;
		var pass = req.body.password;

		MongoClient.connect(uri, function(err, client){
			if(!pass){
				res.status(500).send("Password cannot be empty.");
				client.close();
			}
			if (err) console.log(err);
			var db = client.db("wtdb");
			db.collection("users").findOne({username:user}, function (error, result){
				if (result){
					// If the username is in our database, send an error back
					res.status(500).send("Username Taken!");
					client.close();
				}
				else{
					// If the username is not in our database
					// Insert that user and send a success response
					db.collection("users").insertOne(req.body, function(error2, res){
						if (res){
							console.log("new user was added"); 
						}
						else{
							console.log(error2);
						}
					});
					res.status(200).send("Worked!");
					client.close();
				}
			});
		});
	}
});

// Update when the user adds a new favourite university
app.put('/favourite/', function(req,res){
	// req.body.fav is the address
	// req.body.name is the query
		if (req.session.user){
		var address = req.body.fav;
		MongoClient.connect(uri, function(err, client){
			console.log(req.session.user.username + " connected"); 
			var db = client.db("wtdb");
			db.collection("users").findOne({username:req.session.user.username, saved : {$elemMatch: {$elemMatch: {$in:[req.body.fav]}}}}, function(error, result) {
				if (result) {
					console.log("Already saved");
					res.status(500).send("Already saved");
				}
				else {
					console.log("Successfully added");
					db.collection("users").updateOne(
						{username:req.session.user.username},
						{$push: {saved : [req.body.name, req.body.fav]}}
					);
				res.status(200).send("Successfully added");
				}
			});
		});
	} else{
		res.status(500).send("User is not logged in!");
	}
});

// Get the user's favourite universities
app.get('/favourite/', function(req,res){
	if (req.session.user){
		MongoClient.connect(uri, function(err, client){
			var db = client.db("wtdb");
			db.collection("users").findOne(
				{username:req.session.user.username},
				function(error, result){
					if (result){
						res.status(200).send(result.saved);
					} else{
						res.status(500).send(error);
					}
				}
				);
		});
	} else{
		res.status(500).send("User is not logged in!");
	}
});

app.delete('/favourite/', function(req, res) {
	if (req.session.user) {
		MongoClient.connect(uri, function(err, client) {
			var db = client.db("wtdb");
			db.collection("users").findOne({username:req.session.user.username, saved : {$elemMatch: {$elemMatch: {$in:[req.body.fav]}}}}, function(error, result) {
				if (result) {
					// console.log(req.body);
					console.log("successfully removed");
					db.collection("users").updateOne(
						{username: req.session.user.username},
						{$pull: {saved : [req.body.name.slice(0, -27), req.body.fav]}}
						);
					res.status(200).send("success");
				} else {
					res.status(500).send(error);
				}
			});
		});
	}
});

app.get('/logout/', function(req, res) {
	if (req.session.user) {
		delete req.session.user;

		res.redirect('/');
	}else{
		res.status(500).send("You are not logged in.");
	}
});


function getRandomSalt(){
	return Math.random().toString().slice(2, 5);
}

function cryptPwd(password, salt) {
	salt = "" + salt;
	var hash = crypto.createHmac('sha512', salt);
	hash.update(password);
	var result = hash.digest('hex');
	return result;

}

app.get('/checkLogIn/', function(req, res) {
	if (req.session.user) {
		res.status(200).send();
	} else {
		res.status(401).send();
	}
});

app.listen(3000,() => console.log("Listening"));
