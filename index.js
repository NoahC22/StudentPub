const express = require('express');
const { MongoClient } = require('mongodb');

const PORT = 8080;

const app = express();
app.use(express.static('static'));
app.use(express.urlencoded({extended: false}));
app.set('view engine', 'ejs');

app.get('/user', (req, res) => {
    res.render('userpage')
})

async function main() {
    const uri = "mongodb+srv://PatricioIZL:tOStLjUjbf7MiIjf@cluster0.iwsdnsj.mongodb.net/test"
    const client = new MongoClient(uri);

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        // Make the appropriate DB calls
        await  listDatabases(client);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function listDatabases(client){
    databasesList = await client.db().admin().listDatabases();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};

main().catch(console.error);


app.listen(PORT, () => console.log(`server is listening on port ${PORT}`));
