const { name } = require('ejs');
const express = require('express');
const { MongoClient } = require('mongodb');

const PORT = 8080;


const uri = "mongodb+srv://username:password@cluster0.iwsdnsj.mongodb.net/test"



const client = new MongoClient(uri);

(async function ()
{
        // Connect to the MongoDB cluster
        await client.connect();

        //TEST ITEM
        /*
        await insertSpoon(client, 
            {
                name: "Spoon",
                price: 5.00,
                qty: 3,
                description: "Brand new and works",
                condition: "New",
                img1: "https://m.media-amazon.com/images/I/51aAu04384L.jpg",
                img2: "https://assets.hermes.com/is/image/hermesproduct/attelage-coffee-spoon--006012P-worn-1-0-0-800-800_g.jpg",
                img3: "https://www.amara.com/static/uploads/images-2/products/huge/194863/mood-table-spoon-402898.jpg",
            }
        );
        */

        await insertUser(client, 
            {
                img1:"https://jesussavesmbchurch.org/wp-content/themes/grace-church/images/generic-profile.jpg",
                name: "John Doe",
                email: "john.doe01@utrgv.edu",
                reviews: '"The seller is reliable." "The seller delivered the product on time." "The product was in good quality."',
                
            }
        );
})();

const app = express();
app.use(express.static('static'));
app.use(express.urlencoded({extended: false}));
app.set('view engine', 'ejs');

// Inserting Spoon


async function insertUser(client, newListing){
    // See https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#insertOne for the insertOne() docs
    const result = await client.db("StudentPUB").collection("Users").insertOne(newListing);
    console.log(`New listing created with the following id: ${result.insertedId}`);
}


app.get('/item', async (req, res) => {
    const result = await client.db("StudentPUB").collection("Listings").findOne({ name: "Spoon" });
    console.log(result)
    res.render('item_page', {
        item: result
    })
})

app.get('/user', async (req, res) => {
    const result = await client.db("StudentPUB").collection("Users").findOne({ name: "John Doe" });
    console.log(result)
    res.render('item_page', {
        item: result
    })
})
app.listen(PORT, () => console.log(`server is listening on port ${PORT}`));
