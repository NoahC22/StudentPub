const express = require('express');
const { name } = require('ejs');
const bodyParser = require('body-parser')
const { MongoClient, ObjectId } = require('mongodb');
const multer = require("multer");
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})
const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './userpfps')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})
const upload2 = multer({storage: storage2})
const upload = multer({ storage: storage })
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const PORT = 8080;

const uri = "mongodb+srv://NoahC22:tfdbfm22@cluster0.iwsdnsj.mongodb.net/test"
const client = new MongoClient(uri);

(async function ()
{
        await client.connect();
})();

const app = express();
app.use(express.static('static'));
app.use(express.urlencoded({extended: false}));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));
app.use('/uploads', express.static('uploads'));
app.use('/userpfps', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'static')));
app.use(cookieParser());
app.use(session({secret: 'superSecret', resave: false, saveUninitialized: false}));


//GET ROUTE for homepage
//If not logged in then show them the regular homepage but with nothing really showing
//if they are then show them the items listed, their name, and other options
app.get('/homepage', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('homepage')
	}
	else {
        const submissions = await client.db("StudentPUB").collection("Listings").find({}).toArray();
		res.render('homepage', {
			user: x,
            lists: submissions
		})
	}
})

//GET ROUTE For signup
//check if user is logged in, if not then let them go to sign up page
//if they are then just go back to homepage
app.get('/signup', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('sign_up')
	}
	else {
		res.redirect('homepage')
	}

})

//POST ROUTE for signing up
//gets their email and pass and checks
//checks if account already exists, password is too short, and if email is in proper utrgv format
//If all pass then obtain their name from the email and store this into the User account DB
//show errors and reload page if they put in wrong information
app.post('/signupf', async (req, res) => {
    let new_email = req.body.signupe;
    let new_pass = req.body.signupp;
    let success = true;
    let listoferr = [];

    let test1 = await client.db("StudentPUB").collection("Users").findOne({ email: `${new_email}`});

    if(test1 != null) {
        success = false;
        listoferr.push("Account already exists.")
    }

    if(new_pass.length < 4) {
        success = false;
        listoferr.push("Password is too short.")
    }

    if((/^[a-zA-Z]+.[a-zA-Z]+[0-9][0-9]@[u][t][r][g][v].[e][d][u]/).test(new_email) == false) {
        success = false;
        listoferr.push("Email is not UTRGV format.")
    }

    if (success == true) {

        const fname = new_email.substring(0, new_email.indexOf("."));
        const lname = new_email.substring(new_email.indexOf(".") + 1, new_email.length-12);
        const fullname = fname + " " + lname

        let hash = await bcrypt.hash(new_pass, 10);

        let new_p = {
            email: new_email,
            password: hash,
            name: fullname
        }

        await client.db("StudentPUB").collection("Users").insertOne(new_p)

        let au = await client.db("StudentPUB").collection("Users").findOne({ email: `${new_email}`})
        req.session.user = au;

        res.redirect('homepage')
    } else {
        res.render('sign_up', {
            username: new_email,
			errors: listoferr
        })
    }
})


//GET ROUTE for logging in
//if not logged in, go to loginpage so a user can log in
//if already logged in, just go to homepage
app.get('/login', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('login_page')
	}
	else {
		res.redirect('homepage')
	}
})


//POST ROUTE for when logging in
//Gets the email and password
//Checks if email is empty and if password is too short
//Checks if email is in DB, if so then check if password is right and let them in
//If not then kick them back to login page with a failed message
app.post('/loginp', async (req, res) => {

    let loginu = req.body.logestr;
	let loginp = req.body.logpstr;
    let get_in = true;

    if(loginu == "" || loginp.length < 4) {
        get_in = false;
    }

    const info = await client.db("StudentPUB").collection("Users").findOne({ email: `${loginu}`})
    if(info == null) {
        get_in = false
    }

    if(get_in == true) {
        let compare = await bcrypt.compare(loginp, info.password);

        if(compare == true) {
            const lguser = await client.db("StudentPUB").collection("Users").findOne({ email: `${loginu}`})
            req.session.user = lguser
            res.redirect('homepage')
        } else {
            res.render('login_page', {
                username: loginu,
			    failed: "Wrong!"
            })
        }
    } else {
        res.render('login_page', {
            failed: "Wrong!"
        })
    }
})

//GET ROUTE FOR logout
//deletes their session and goes back to homepage
app.get('/logout', (req,res) => {
	delete req.session.user;
    res.redirect('homepage');
});

//GET ROUTE for user page
//if not logged in then go back to homepage
//if so then show them their own information
app.get('/user/:name', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.redirect('homepage')
	}
	else {
        const fname = req.params["name"];
        const info = await client.db("StudentPUB").collection("Users").findOne({ name: fname})
        let ifuser = false;
        if(info.name == req.session.user.name) {
            ifuser = true;
        }
		res.render('userpage', {
			userinfo: info,
            ifu: ifuser
		})
	}
})

//POST ROUTE for updating profile picture
//If no image file then nothing is updated
//If image gets updated, get info of who ever is signed in then update it by adding a new field
//That field will have the path to the new image and reflect on the user page
app.post('/userprf', upload.single("pfp"), async (req, res) => {

    let pass = true;
    if(req.file == undefined) {
        pass = false;
    }
    if(pass == true) {
        console.log(req.file)
        let ch = { name: req.session.user.name}
        let new_val = { $set: {imgpath: req.file.path }}
        await client.db("StudentPUB").collection("Users").updateOne(ch, new_val)
        res.redirect(`user/${req.session.user.name}`)
    } else {
        res.redirect(`/user/${req.session.user.name}`) 
    }
})

//GET ROUTE for viewing items
//if not logged in them kick them to homepage
//if they are then show them all the entries they have submitted themselves
app.get('/view_items/:name', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.redirect('homepage')
	}
	else {
        const vname = req.params["name"];
        const result = await client.db("StudentPUB").collection("Listings").find({ user_name: vname}).toArray();
        let suser = false;
        if(req.session.user.name == vname) {
            suser = true;
        }
        res.render('view_own_entries', {
            itms: result,
            showuser: suser
        })
    }
})

//GET ROUTE for deleting item from db
//If not logged in, kicks you out to homepage
//If logged in and viewing your own items, you can delete them if you don't want them to appear anymore
//after it deletes, it shows your items again
app.get('/delete/:ind', async (req, res) => {
    let x = req.session.user;
    if (x == undefined) {
        res.redirect('homepage')
    } else {
        const itmid = req.params["ind"];
        await client.db("StudentPUB").collection("Listings").deleteOne({ _id: new ObjectId(itmid)})
        res.redirect(`http://localhost:8080/view_items/${req.session.user.name}`)
    }
})

//GET ROUTE for adding an item to the db form
//if not logged in then kick back to homepage
//if they are then let them in
app.get('/addoredit', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.redirect('homepage')
	}
	else {
        res.render('addeditpage')
	}

})


//POST ROUTE for when adding item to db
//Gets name, desc, and condition and turns them to string
//if its blank then dont let them submit and leave a warning
//for price, check if it can be a valid float format and if not, dont let them submit and leave a warning
//for quantity check if it can be a integer, if not leave a warning
//adds name to to the item so it knows who just submitted an item
//IMAGE NEEDS TO BE FIXED, doesn't work that well
app.post('/addtodb', upload.array('itmimg', 3), async (req, res) => {

    const adderrors = []
    let addin = true;
    let itmname = String(req.body.itmname)
    let itmdesc = String(req.body.itmdesc)
    let itmcond = String(req.body.itmcond)

    if(req.files.length != 3) {
        addin = false;
        adderrors.push("Submit 3 image files.")
    }

    if((/^[0-9]+/).test(req.body.itmqty) == false) {
        addin = false;
        adderrors.push("Quantity is not a proper integer.")
    }

    if((/^[0]+$/).test(req.body.itmqty) == true) {
        addin = false;
        adderrors.push("Quantity can't be 0.")
    }

    if((/^[0-9]+.[0-9][0-9]/).test(req.body.itmp) == false) {
        addin = false;
        adderrors.push("Price is not a proper float.")
    }

    if(itmname == "" || itmdesc == "" || itmcond == "") {
        adderrors.push("Don't leave a section blank.")
        addin = false;
    }

    if(addin == false) {
        res.render('addeditpage', {
            errors: adderrors,
            iname: itmname,
            idesc: itmdesc,
            icond: itmcond
        })
    } else {

        let im1 = req.files[0].path
        let im2 = req.files[1].path
        let im3 = req.files[2].path

        let itmqty = parseInt(req.body.itmqty)
        let itmp = parseFloat(req.body.itmp)

        let newi = {
            user_name: req.session.user.name,
            name: itmname,
            description: itmdesc,
            qty: itmqty,
            condition: itmcond,
            price: itmp,
            img1: im1,
            img2: im2,
            img3: im3
        }
    
        await client.db("StudentPUB").collection("Listings").insertOne(newi);
        res.redirect(`view_items/${req.session.user.name}`)
    }
})


//GET ROUTE for viewing single item
//if not logged in, go to homepage
//if logged in, take the ID of whatever is being clicked and load the information onto the item_page.ejs
app.get('/item/:ind', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('homepage')
	}
	else {
        const ind = req.params['ind']
        const result = await client.db("StudentPUB").collection("Listings").findOne({ _id: new ObjectId(ind)})
        res.render('item_page', {
            item: result
        })
    }
})

//For any link that is not listed above
//sends 404 message
app.all('*', (req, res) => {
    res.sendStatus(404);
});

app.listen(PORT, () => console.log(`server is listening on port ${PORT}`));
