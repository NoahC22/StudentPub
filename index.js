const express = require('express');
const fs = require('fs')
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

const uri = "mongodb+srv://EveryAdmin:adminpass90@cluster0.iwsdnsj.mongodb.net/test"
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

app.get('/', async (req, res) => {
    res.redirect('/homepage')
})

//GET ROUTE for homepage
//If not logged in then show them the regular homepage but with nothing really showing
//if they are then show them the items listed, their name, and other options
app.get('/homepage', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('homepage')
	}
	else {
        let submissions = await client.db("StudentPUB").collection("Listings").find({}).toArray();
        submissions = submissions.reverse()
		res.render('homepage', {
			user: x,
            lists: submissions
		})
	}
})


//POST ROUTE For search bar functionality
//Gets whatever the user typed in the search bar and takes in the information
//It then goes into the collection of listings and find uses regex to see if whatever the user typed matches the item's name
//if so, print out that information
app.post('/home_search', async (req, res) => {
    let x = req.body.search
    x = x.toLowerCase()
    let info = await client.db("StudentPUB").collection("Listings").find({ dname: {$regex: x}}).toArray();
    info = info.reverse()
    res.json(info)
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

    let test1 = await client.db("StudentPUB").collection("Users").findOne({ email: `${new_email.toLowerCase()}`});

    if(test1 != null) {
        success = false;
        listoferr.push("Account already exists.")
    }

    if(new_pass.length < 6) {
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
            email: new_email.toLowerCase(),
            password: hash,
            name: fullname
        }

        await client.db("StudentPUB").collection("Users").insertOne(new_p)

        let au = await client.db("StudentPUB").collection("Users").findOne({ email: `${new_email.toLowerCase()}`})
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

    const info = await client.db("StudentPUB").collection("Users").findOne({ email: `${loginu.toLowerCase()}`})
    if(info == null) {
        get_in = false
    }

    if(get_in == true) {
        let compare = await bcrypt.compare(loginp, info.password);

        if(compare == true) {
            const lguser = await client.db("StudentPUB").collection("Users").findOne({ email: `${loginu.toLowerCase()}`})
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
        const rev = await client.db("StudentPUB").collection("Reviews").find({ receiver: fname}).toArray()
        const info = await client.db("StudentPUB").collection("Users").findOne({ email: fname})
        let ifuser = false;
        if(info.email == req.session.user.email) {
            ifuser = true;
        }
		res.render('userpage', {
			userinfo: info,
            ifu: ifuser,
            reviews: rev
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

        const bufferi = fs.readFileSync(req.file.path)
        let i = bufferi.toString('base64')
        let i2 = `data:${req.file.mimetype};base64,${i}`

        let ch = { email: req.session.user.email}
        let new_val = { $set: {imgpath: i2 }}
        await client.db("StudentPUB").collection("Users").updateOne(ch, new_val)
        res.redirect(`user/${req.session.user.email}`)
    } else {
        res.redirect(`/user/${req.session.user.email}`) 
    }
})

//POST ROUTE for adding review
//Gets the message and the person who is getting the review
//If the message is empty, don't add anything
//If its not, make a new Review with the message, author, and receiver
app.post('/review/:name', async (req, res) => {
    const email = req.params["name"]
    let sent = req.body.sentence;

    if(!sent.trim()) {
        res.redirect(`/user/${email}`)
    } else {

        let date = new Date()
        let day =  (date.getMonth()+1) + '/' + date.getDate() + '/' + date.getFullYear()
        let time = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
        let dates = day + ' ' + time
        console.log(dates)

        let newi = {
            msg: sent,
            author: req.session.user.email,
            receiver: email,
            dt: dates,
            comments: []
        }
        await client.db("StudentPUB").collection("Reviews").insertOne(newi)

        res.redirect(`/user/${email}`)
    }

})

app.post('/comment/:id', async (req, res) => {
    const ind = req.params["id"]
    let sent = req.body.csentence
    
    let info = await client.db("StudentPUB").collection("Reviews").findOne({ _id: new ObjectId(ind)})

    if(!sent.trim()) {
        res.redirect(`/user/${info.receiver}`)
    } else {

        let date = new Date()
        let day =  (date.getMonth()+1) + '/' + date.getDate() + '/' + date.getFullYear()
        let time = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
        let dates = day + ' ' + time

        let newi = {
            cmsg: sent,
            cauthor: req.session.user.email,
            cdt: dates,
            creceiver: info.receiver,
            reviewid: ind
        }

        let chi = { _id: new ObjectId(ind)}
        let new_val = { $push: { comments: newi }}
        await client.db("StudentPUB").collection("Reviews").updateOne(chi, new_val)

        res.redirect(`/user/${info.receiver}`)
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
        const result = await client.db("StudentPUB").collection("Listings").find({ user_email: vname}).toArray();
        let suser = false;
        if(req.session.user.email == vname) {
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
        const cinfo = await client.db("StudentPUB").collection("Listings").findOne({ _id: new ObjectId(itmid)})
        if(cinfo.user_email == req.session.user.email) {
            await client.db("StudentPUB").collection("Listings").deleteOne({ _id: new ObjectId(itmid)})
            res.redirect(`/view_items/${req.session.user.email}`)
        } else {
            res.redirect('homepage')
        }
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
        res.render('addeditpage', {
            user: x
        })
	}

})


//POST ROUTE for when adding item to db
//Gets name, desc, and condition and turns them to string
//if its blank then dont let them submit and leave a warning
//for price, check if it can be a valid float format and if not, dont let them submit and leave a warning
//for quantity check if it can be a integer, if not leave a warning
//adds name to to the item so it knows who just submitted an item
app.post('/addtodb', upload.array('itmimg', 3), async (req, res) => {

    let x = req.session.user;
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
        adderrors.push("Price is not a proper decimal value. Example: 20.00 and 29.99 are valid")
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
            icond: itmcond,
            ip: req.body.itmp,
            iq: req.body.itmqty,
            user: x
        })
    } else {

        const buffer1 = fs.readFileSync(req.files[0].path)
        let i1 = buffer1.toString('base64')
        let im1 = `data:${req.files[0].mimetype};base64,${i1}`

        const buffer2 = fs.readFileSync(req.files[1].path);
        let i2 = buffer2.toString('base64')
        let im2 = `data:${req.files[1].mimetype};base64,${i2}`

        const buffer3 = fs.readFileSync(req.files[2].path)
        let i3 = buffer3.toString('base64')
        let im3 = `data:${req.files[2].mimetype};base64,${i3}`

        let itmqty = parseInt(req.body.itmqty)
        let itmp = parseFloat(req.body.itmp)

        let strprice = String(itmp)
        let itmdecimal = strprice.substring(strprice.indexOf(".")+1, strprice.length)
        let aoz = false
        if(itmdecimal.length == 1) {
            aoz = true
        }else {
            aoz = false
        }
	if(strprice.length == 1) {
	aoz = false;
	}

        let newi = {
            user_email: req.session.user.email,
            dname: itmname.toLowerCase(),
            name: itmname,
            description: itmdesc,
            qty: itmqty,
            condition: itmcond,
            price: itmp,
            img1: im1,
            img2: im2,
            img3: im3,
            az: aoz
        }
    
        await client.db("StudentPUB").collection("Listings").insertOne(newi);
        res.redirect(`view_items/${req.session.user.email}`)
    }
})


//GET ROUTE for viewing single item
//if not logged in, go to homepage
//if logged in, take the ID of whatever is being clicked and load the information onto the item_page.ejs
//Now the logged in user can't buy their own items and can only buy other people's items
app.get('/item/:ind', async (req, res) => {

    let x = req.session.user;
	if(x == undefined) {
		res.render('homepage')
	}
	else {
        const ind = req.params['ind']
        let shuser = true;
        const result = await client.db("StudentPUB").collection("Listings").findOne({ _id: new ObjectId(ind)})
        if(req.session.user.email == result.user_email) {
            shuser = false;
        }
        res.render('item_page', {
            item: result,
            showuser: shuser
        })
    }
})

//POST ROUTE for ordering item
//checks if its blank, if it is then reload to same page
//if not, then make a new order and keep information
app.post('/orderitem/:ind', async (req, res) => {
    const ind = req.params['ind'];
    let qtyval = req.body.qtyctrl

    if(qtyval == "") {
        res.redirect(`/item/${ind}`)
    } else {
        const inf = await client.db("StudentPUB").collection("Listings").findOne({ _id: new ObjectId(ind)})
        let fp = qtyval * inf.price

        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        });
          
        fp = formatter.format(fp)

        let neword = {
            itmname: inf.name,
            itmholder: inf.user_email,
            buyer: req.session.user.email,
            qty: parseInt(qtyval),
            itm_id: ind,
            total: fp,
            status: "Pending"
        }
        const rd = await client.db("StudentPUB").collection("Orders").insertOne(neword)
        res.redirect(`/transaction/${rd.insertedId}`)
    }
})


//GET ROUTE for transactions
//Will show information about item and total
app.get('/transaction/:ind', async (req, res) => {
    let x = req.session.user
    if (x == undefined) {
        res.redirect('homepage')
    } else {
        const ind = req.params["ind"];

        const oinfo = await client.db("StudentPUB").collection("Orders").findOne({ _id: new ObjectId(ind)})
        const itminfo = await client.db("StudentPUB").collection("Listings").findOne({ _id: new ObjectId( oinfo.itm_id)})

        if(oinfo.buyer == req.session.user.email) {
            res.render('transaction', {
                iteminfo: itminfo,
                orderinfo: oinfo
            })
        } else {
            res.redirect('homepage')
        }
    }
})

//GET ROUTE for deleting order transaction
//IF you are not buying the right items or want to change, then you can click cancel order
//deletes the order and brings you back to the item you were viewing
app.get('/orderdelete/:ind', async (req, res) => {
    let x = req.session.user;
    if (x == undefined) {
        res.redirect('homepage')
    } else {
        const ordid = req.params["ind"];
        const oinfo = await client.db("StudentPUB").collection("Orders").findOne({ _id: new ObjectId(ordid)})
        const iinfo = await client.db("StudentPUB").collection("Listings").findOne({ _id: new ObjectId(oinfo.itm_id)})
        if(oinfo.buyer == req.session.user.email) {
            await client.db("StudentPUB").collection("Orders").deleteOne({ _id: new ObjectId(ordid)})
            res.redirect(`/item/${iinfo._id}`)
        } else {
            res.redirect('homepage')
        }
    }
})

//POST ROUTE for buying item
//Gets the order and item information and gets the new quantity
//after getting that, it then changes the items quantity since some of it is being bought
//it then goes to check if it can delete it
app.post('/orderup/:ind', async (req, res) => {
    const ind = req.params["ind"]
    const oinfo = await client.db("StudentPUB").collection("Orders").findOne({ _id: new ObjectId(ind)})
    const iinfo = await client.db("StudentPUB").collection("Listings").findOne({ _id: new ObjectId(oinfo.itm_id)})

    if(iinfo == null || iinfo == undefined) {
        let c = { $set: {status: "Item Out of Stock"}}
        await client.db("StudentPUB").collection("Orders").updateOne(oinfo, c)
        res.redirect('/homepage')
    } else {

    
        
    let new_qty = iinfo.qty - oinfo.qty

    let chi = { _id: new ObjectId(oinfo.itm_id)}
    let new_val = { $set: {qty: new_qty }}
    await client.db("StudentPUB").collection("Listings").updateOne(chi, new_val)

    let api = { _id: new ObjectId(ind)}
    let ns = { $set: {status: "Approved"}}
    await client.db("StudentPUB").collection("Orders").updateOne(api, ns)

    res.redirect(`/checkfordelete/${oinfo.buyer}`)    
    }
})

//GET ROUTE to check for deleting item
//after buying an item it goes here to see if the quantity is 0
//if it is, delete it, if not return home
app.get('/checkfordelete/:hold', async (req, res) => {
    const holder = req.params["hold"]
    let x = req.session.user
    if(x == undefined) {
        res.redirect('homepage')
    } else {
        await client.db("StudentPUB").collection("Listings").deleteMany({ qty: 0})
        res.redirect(`/thankyou/${holder}`)
    }
})


//GET ROUTE for thank you message
//Tells the user a thank you message and information of the item holder
//Either go back to homepage or back to user page to leave a review
app.get('/thankyou/:hold', async (req, res) => {
    let x = req.session.user
    const hold = req.params["hold"]
    if( x == undefined) {
        res.redirect('homepage')
    } else {
        const info = await client.db("StudentPUB").collection("Users").findOne({ email: hold})
        res.render('thankyoupage', {
            user: info
        })
    }
})

//GET ROUTE for history
//clicking it views the list of past orders that were made by the user
app.get('/history', async (req, res) => {
    let x = req.session.user
    if(x == undefined) {
        res.redirect('homepage')
    } else {
        const oinfo = await client.db("StudentPUB").collection("Orders").find({ buyer: req.session.user.email}).toArray()
        res.render('historypage', {
            orders: oinfo
        })
    }
})

//GET ROUTE for placing order
//this is for viewing orders that you yourself have placed and are pending
//it searches those orders with that criteria and prints them out
app.get('/placedorders', async (req, res) => {
    let x = req.session.user
    if (x == undefined) {
        res.redirect('homepage')
    } else {
        let i = {
            status: "Pending",
            buyer: req.session.user.email
        }
        const info = await client.db("StudentPUB").collection("Orders").find(i).toArray();
        res.render('pendorders', {
            yorders: info
        })
    }
})

//GET ROUTE for cancelling order
//Gets the id of the order and changes the status to canceled
//this is in case you want to get rid of an order
app.get('/cancelorder/:ind', async (req, res) => {
    let x = req.session.user
    if(x==undefined) {
        res.redirect('homepage')
    } else {
 
        const ind = req.params["ind"]
        let ch = { _id: new ObjectId(ind)}
        let new_val = { $set: {status: "Canceled" }}
        await client.db("StudentPUB").collection("Orders").updateOne(ch, new_val)

        res.redirect('/placedorders')
    }
})

//GET ROUTE for incoming orders
//Gets the orders that are pending and that are being bought from you
//prints them all out
app.get('/incorders', async (req, res) => {
    let x = req.session.user
    if(x == undefined) {
        res.redirect('homepage')
    } else {
        let i = {
            status: "Pending",
            itmholder: req.session.user.email
        }

        const info = await client.db("StudentPUB").collection("Orders").find(i).toArray()
        res.render('incomingorders', {
            incorders: info
        })
    }
})

//GET ROUTE For declining an order
//gets the id of the order and changes the status to declined
//this is in case you want to decline an incoming order from somebody
app.get('/decline/:ind', async (req, res) => {
    let x = req.session.user
    if(x==undefined) {
        res.redirect('homepage')
    } else {
 
        const ind = req.params["ind"]
        let info = await client.db("StudentPUB").collection("Orders").findOne({ _id: new ObjectId(ind)})

        res.render('declineorder', {
            oinfo: info
        })
    }
})

//POST ROUTE for declining order
//gets the text from the textbox and checks if its blank
//if it is, just put declined and no reason specified
//if its not, put the reason why also
app.post('/dec/:ind', async (req, res) => {
    let text = String(req.body.reasondecl)
    const ind = req.params["ind"]
    if(text == "") {
        let ch = { _id: new ObjectId(ind)}
        let new_val = { $set: {status: "Declined. No Reason Specified" }}
        await client.db("StudentPUB").collection("Orders").updateOne(ch, new_val)
        res.redirect('/incorders')
    } else {
        let ch = { _id: new ObjectId(ind)}
        let new_val = { $set: {status: "Declined. " + text }}
        await client.db("StudentPUB").collection("Orders").updateOne(ch, new_val)
        res.redirect('/incorders')
    }
})


//For any link that is not listed above
//sends 404 message
app.all('*', async (req, res) => {
    res.sendStatus(404);
});


app.listen(PORT, () => console.log(`server is listening on port ${PORT}`));
