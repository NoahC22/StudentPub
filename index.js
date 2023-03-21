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
app.use(express.static(path.join(__dirname, 'static')));
app.use(cookieParser());
app.use(session({secret: 'superSecret', resave: false, saveUninitialized: false}));

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

app.get('/login', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('login_page')
	}
	else {
		res.redirect('homepage')
	}
})

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

app.get('/addoredit', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.redirect('homepage')
	}
	else {
        res.render('addeditpage')
	}

})

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


app.post('/addtodb', upload.array('itmimg', 3), async (req, res) => {

    const adderrors = []
    let addin = true;
    let itmname = String(req.body.itmname)
    let itmdesc = String(req.body.itmdesc)
    let itmcond = String(req.body.itmcond)

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

        let itmqty = parseInt(req.body.itmqty)
        let itmp = parseFloat(req.body.itmp)

        let newi = {
            user_name: req.session.user.name,
            name: itmname,
            description: itmdesc,
            qty: itmqty,
            condition: itmcond,
            price: itmp,
            img1: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Un1.svg/1200px-Un1.svg.png",
            img2: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Deux.svg/1200px-Deux.svg.png",
            img3: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Trois.svg/1200px-Trois.svg.png"
        }
    
        await client.db("StudentPUB").collection("Listings").insertOne(newi);
        res.redirect(`view_items`)
    }
})

app.get('/view_items', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.redirect('homepage')
	}
	else {
        const result = await client.db("StudentPUB").collection("Listings").find({ user_name: req.session.user.name}).toArray();
        res.render('view_own_entries', {
            itms: result
        })
    }
})

app.get('/signup', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('sign_up')
	}
	else {
		res.redirect('homepage')
	}

})

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

app.get('/logout', (req,res) => {
	delete req.session.user;
    res.redirect('homepage');
});

app.get('/user', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.redirect('homepage')
	}
	else {
		res.render('userpage', {
			user: x
		})
	}
})

app.listen(PORT, () => console.log(`server is listening on port ${PORT}`));