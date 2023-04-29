const request = require('supertest');
const app = require('../index')
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const puppeteer = require('puppeteer');
const uri = "mongodb+srv://EveryAdmin:adminpass90@cluster0.iwsdnsj.mongodb.net/test"
const client = new MongoClient(uri);

(async function ()
{
        await client.connect();
})();

const db = client.db('StudentPUB');
let user_collection = db.collection('Users')
const fake_email = 'john.doe02@utrgv.edu';
const fake_pass = 'Thisismypassword12';
const fake_email2 = 'Edward.doe02@utrgv.edu';
const fake_pass2 = 'Thisishispassword12';


// describe('Template', () => {
//     let browser, page;
  
//     beforeAll(async () => {
//       browser = await puppeteer.launch();
//       page = await browser.newPage();
//       await page.goto('http://localhost:8080/Template');
//     });

//     test('Template', async () => {
//         await Promise.all([
//             page.waitForNavigation(),
//             await page.click('#Template'),
//         ]);
//     });

// });

let browser, page;
  
beforeAll(async () => {
  browser = await puppeteer.launch(
    {headless: 'new'}
  );
  page = await browser.newPage();
  await page.goto('http://localhost:8080/signup');
});


//Signup feauture functionality
describe('SignUp Page Functionality', () => {

    test('Sign Up Page Responsive through web server', async () => {
        const response = await request(app).get('/signup');
        expect(response.statusCode).toBe(200);
    })
  
    test('should allow the user to sign up with valid credentials', async () => {
      // Find the username and password input fields and enter valid credentials
      await page.type('#exampleDropdownFormEmail2', fake_email);
      await page.type('#exampleDropdownFormPassword2', fake_pass);
  
      // Submit the form and wait for the page to reload
      await Promise.all([
        page.waitForNavigation(),
        page.click('#signup-button'),
      ]);

      const url1 = await page.url();

      // Check that the user is redirected to the dashboard page
      console.log(url1);
      expect(url1.includes('http://localhost:8080/homepage') || url1.includes('http://localhost:8080/signupf')).toEqual(true);

      //Check if its in database
      const result = await user_collection.findOne({ email: fake_email });
      expect(result);
      
      
    });

  });

  //Homepage feature Functionality
describe('Homepage Functionality', () => {

    beforeAll(async () => {
      await page.goto('http://localhost:8080/homepage');
    });

    test('Home Page Responsive through web server', async () => {
        const response = await request(app).get('/homepage');
        expect(response.statusCode).toBe(200);
    })
    //test to check if button for login and signup work on non-signed in users
    test('Check /homepage buttons work', async () => {

        //Check that the /homepage when no login says 'Welcome, Guest!'
        const welcomeText = await page.evaluate(() => {
            const container = document.querySelector('#top-text');
            return container.textContent.trim();
          });
        
          expect(welcomeText).toBe('Welcome Guest!');
  
      // Submit the form and wait for the page to reload
      await Promise.all([
        page.waitForNavigation(),
        await page.click('#login-button-home'),
      ]);
      // Check that the user is redirected to the dashboard page
      expect(page.url()).toEqual('http://localhost:8080/login');
      await page.goto('http://localhost:8080/homepage');
     

      await Promise.all([
        page.waitForNavigation(),
        await page.click('#signup-button-home'),
      ]);
      // Check that the user is redirected to the dashboard page
      expect(page.url()).toEqual('http://localhost:8080/signup');

           
    })
});

describe('Logging in with test account', () => {
    beforeAll(async () => {
      await page.goto('http://localhost:8080/login');
    });

    jest.setTimeout(20000);

    test('Logs user into the website', async () => {

        await page.type('#exampleDropdownFormEmail2', fake_email);
        await page.type('#exampleDropdownFormPassword2', fake_pass);


        await Promise.all([
            page.waitForNavigation(),
            await page.click('#sign-in-login'),
        ]);
        const url2 = await page.url();

      // Check that the user is redirected to the dashboard page
      console.log(url2);
      expect(url2.includes('http://localhost:8080/homepage') || url2.includes('http://localhost:8080/loginp')).toEqual(true);


    });

    test('Logged in Verifies Name of User', async () => {

        const welcomeText = await page.evaluate(() => {
            const container = document.querySelector('#top-text');
            return container.textContent.trim();
          });
        
          expect(welcomeText).toBe('Welcome, john doe!');
    });

    test('Checking button functionality within logged in homepage', async () => {

        await Promise.all([
            page.waitForNavigation(),
            await page.click('#my-user-button'),
        ]);

        expect(page.url()).toEqual('http://localhost:8080/user/' + fake_email);

        await Promise.all([
            page.waitForNavigation(),
            await page.click('#back'),
        ]);
        
        await Promise.all([
            page.waitForNavigation(),
            await page.click('#my-entries'),
        ]);

        expect(page.url()).toEqual('http://localhost:8080/view_items/' + fake_email);

        await Promise.all([
            page.waitForNavigation(),
            await page.click('#back'),
        ]);

        
        console.log(page.url())
        await Promise.all([
            page.waitForNavigation(),
            await page.click('#placed-order-button'),
        ]);

        expect(page.url()).toEqual('http://localhost:8080/placedorders');

        await Promise.all([
            page.waitForNavigation(),
            await page.click('#back'),
        ]);

        await Promise.all([
          page.waitForNavigation(),
          await page.click('#incoming-orders'),
      ]);

      expect(page.url()).toEqual('http://localhost:8080/incorders');

      await Promise.all([
          page.waitForNavigation(),
          await page.click('#back'),
      ]);

      await Promise.all([
        page.waitForNavigation(),
        await page.click('#my-history'),
    ]);

    expect(page.url()).toEqual('http://localhost:8080/history');

    await Promise.all([
        page.waitForNavigation(),
        await page.click('#back'),
    ]);

    });
  
    test('Sign out Successfully', async () => {
        await Promise.all([
            page.waitForNavigation(),
            await page.click('#sign-out'),
        ]);
    
        const url3 = await page.url();
    
      // Check that the user is redirected to the dashboard page
      console.log(url3);
      expect(url3.includes('http://localhost:8080/homepage') || url3.includes('http://localhost:8080/logout')).toEqual(true);
    });

});


describe('Close Browser', () => {

      test('Browser Closing', async () => {
        await browser.close();
    });
      
});