const express = require('express');
const request = require('request');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

const serviceAccount = require('./fkey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-igo9m%40project-f-8c0b9.iam.gserviceaccount.com',
});

const db = admin.firestore();
app.set('view engine', 'ejs');
app.use(express.static('web401'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('homepage', { message: '' });
});

app.get('/signup', (req, res) => {
  res.render('signup', { message: '' });
});

app.get('/login', (req, res) => {
  res.render('login', { message: '' });
});

app.get('/index', async (req, res) => {
  const { email } = req.query;


  const userRef = db.collection('users').doc(email);
  const userSnapshot = await userRef.get();
  const username = userSnapshot.exists ? userSnapshot.data().username : '';

  res.render('index', { username });
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.render('signup', { message: 'All fields are required.' });
  }

  
  const hashedPassword = await bcrypt.hash(password, 10);
  const userRef = db.collection('users').doc(email);
  const userSnapshot = await userRef.get();

  if (userSnapshot.exists) {
    return res.render('signup', { message: 'Email already exists. Please choose another one.' });
  }
  await userRef.set({ username, email, password: hashedPassword });
  res.render('login', { message: 'Signup successful. Please log in.' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { message: 'Email and password are required.' });
  }
  const userRef = db.collection('users').doc(email);
  const userSnapshot = await userRef.get();
  
  if (!userSnapshot.exists) {
    return res.render('login', { message: 'Invalid Email or password. Please try again.' });
  }

  const storedPassword = userSnapshot.data().password;
  const passwordMatch = await bcrypt.compare(password, storedPassword);

  if (!passwordMatch) {
    return res.render('login', { message: 'Invalid Email or password. Please try again.' });
  }
  res.redirect('/index?email=' + email);
});

app.post('/detect', (req, res) => {
  const cityName = req.body.cityName;
  const apiKey = 'hxnXcXt3A0jJKkahJuak6UtUm7Hn0YW1XbEd69gk';
  request.get({
    url: 'https://api.api-ninjas.com/v1/airquality?city=' + cityName,
    headers: {
      'X-Api-Key': apiKey,
    },
  }, (error, response, body) => {
    if (error) {
      return res.render('result', { error: 'Request failed' });
    } else if (response.statusCode !== 200) {
      return res.render('result', { error: 'Error fetching air quality data' });
    } else {
      const airQualityData = JSON.parse(body);
      res.render('result', { result: airQualityData, cityName: cityName });
    }
  });
});
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
