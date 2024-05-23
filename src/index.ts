import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Player } from '../Interfaces/Interface';

dotenv.config();

// Express app initialisatie
const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI: string = process.env.MONGO_URI ?? '';
const dbName = process.env.DB_NAME ?? '';

// MongoDB client en database initialisatie
const client = new MongoClient(mongoURI);
let db: Db;
let usersCollection: Collection;
let playersCollection: Collection;


// User type definitie
interface User {
  _id: ObjectId;
  username: string;
  password: string;
  role: string;
}

// Middleware initialisatie
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: 'geheim',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await usersCollection.findOne({ username }) as User;
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, (user as User)._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(id as string) }) as User;
    done(null, user);
  } catch (err) {
    done(err);
  }
});
    
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
    usersCollection = db.collection('users');
    playersCollection = db.collection('players');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

async function importPlayersDataToMongoDB() {
  try {
    const count = await playersCollection.countDocuments();
    if (count === 0) {
      const playersDataPath = path.join(__dirname, '../players.json');
      const playersData = await fs.promises.readFile(playersDataPath, 'utf-8');
      const parsedPlayersData = JSON.parse(playersData);
      const result = await playersCollection.insertMany(parsedPlayersData);
      console.log(`${result.insertedCount} files zijn toegevoegd in cluster.`);
    } else {
      console.log('Spelersgegevens zijn al geïmporteerd naar MongoDB.');
    }
  } catch (error) {
    console.error(`fout importeren MongoDB: ${error}`);
  }
}

connectToMongoDB()
  .then(() => importPlayersDataToMongoDB())
  .catch(error => console.error('Failed to import players data:', error));

// Express view engine instelling
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Laden van JSON data functie
const playersFilePath = path.join(__dirname, '../players.json'); 
const players = loadJSONData(playersFilePath);

function loadJSONData(filename: string): Player[] {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON file: ${error}`);
        return [];
    }
}

// Middleware voor het doorgeven van sessiegegevens naar views
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.user = req.user as User;
  res.locals.username = (req.user as User)?.username || null; 
  next();
});

// Middleware om ervoor te zorgen dat de gebruiker is ingelogd
function ensureLoggedIn(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  next();
}

// Middleware om ervoor te zorgen dat de gebruiker een admin is
function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && (req.user as User).role !== 'ADMIN') {
    return res.status(403).send('Toegang verboden');
  }
  next();
}

// Route voor homepagina
app.get('/', (req, res) => {
    res.render('index', { players }); 
});

// Route voor detailpagina van speler
// Route voor detailpagina van speler 
// Route voor detailpagina van speler
app.get('/detail/:id', ensureLoggedIn, async (req, res) => {
  const playerId = req.params.id;
  const player = players.find(p => p.id === playerId);

  // Controleer of de gebruiker een admin is
  const isAdmin = req.user && (req.user as User).role === 'ADMIN';

  if (player) {
    res.render('detail', { player, isAdmin }); // Voeg isAdmin toe aan de render context
  } else {
    res.status(404).send('Invalid Player ID');
  }
});





// Route voor overzichtspagina van spelers
app.get('/overview', ensureLoggedIn, async (req, res) => {
  const sortAttribute: keyof Player = req.query.sortAttribute as keyof Player || 'name';
  const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
  const players = await playersCollection.find().toArray();

  const sortedPlayers = players.sort((a, b) => {
    const attrA = sortAttribute === 'club' ? a.club.name : a[sortAttribute];
    const attrB = sortAttribute === 'club' ? b.club.name : b[sortAttribute];

    if (typeof attrA !== 'undefined' && typeof attrB !== 'undefined') {
      if (attrA < attrB) return -1 * sortOrder;
      if (attrA > attrB) return 1 * sortOrder;
    }

    return 0;
  });

  res.render('overview', { players: sortedPlayers });
});

// Route voor inlogpagina
app.get('/login', (req, res) => {
  res.render('login');
});

// Route voor inloggen
app.post('/login', passport.authenticate('local', {
  successRedirect: '/overview',
  failureRedirect: '/login',
  failureFlash: false
}));

// Route voor registratiepagina
app.get('/register', (req, res) => {
  res.render('register');
});

// Route voor registreren
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const userExists = await usersCollection.findOne({ username });
  if (userExists) {
    return res.status(409).send('Gebruikersnaam bestaat al');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await usersCollection.insertOne({ username, password: hashedPassword, role: 'USER' });
  res.redirect('/login');
});

// Route voor uitloggen
app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.redirect('/login');
  });
});


// Server luistert naar opgegeven poort
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
