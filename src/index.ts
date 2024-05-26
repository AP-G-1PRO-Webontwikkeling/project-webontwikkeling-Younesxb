import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Player, Club } from '../Interfaces/Interface';
import flash from 'connect-flash';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI: string = process.env.MONGO_URI ?? '';
const dbName = process.env.DB_NAME ?? '';

const client = new MongoClient(mongoURI);
let db: Db;
let usersCollection: Collection;
let playersCollection: Collection<Player>;

interface User {
  _id: ObjectId;
  username: string;
  password: string;
  role: string;
}

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: 'geheim',
  resave: false,
  saveUninitialized: false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  next();
});

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
      const parsedPlayersData: Player[] = JSON.parse(playersData);
      const result = await playersCollection.insertMany(parsedPlayersData);
      console.log(`${result.insertedCount} players have been added to the database.`);
    } else {
      console.log('Player data has already been imported to MongoDB.');
    }
  } catch (error) {
    console.error(`Error importing to MongoDB: ${error}`);
  }
}

connectToMongoDB()
  .then(() => importPlayersDataToMongoDB())
  .catch(error => console.error('Failed to import players data:', error));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

const playersFilePath = path.join(__dirname, '../players.json'); 
const players = loadJSONData(playersFilePath);

function loadJSONData(filename: string): Player[] {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data) as Player[];
    } catch (error) {
        console.error(`Error reading JSON file: ${error}`);
        return [];
    }
}

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.user = req.user as User;
  res.locals.username = (req.user as User)?.username || null; 
  next();
});

function ensureLoggedIn(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  next();
}
function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && (req.user as User).role !== 'ADMIN') {
    return res.status(403).send('Toegang verboden');
  }
  next();
}




app.get('/', (req, res) => {
    res.render('index', { players }); 
});

app.get('/detail/:id', ensureLoggedIn, async (req, res) => {
  const playerId = req.params.id;
  const playerIndex = players.findIndex(p => p.id === playerId);

  if (playerIndex !== -1) {
    const player = players[playerIndex];
    const isAdmin = req.user && (req.user as User).role === 'ADMIN';
    
    let nextPlayerId = null;
    if (playerIndex === players.length - 1) {
      nextPlayerId = players[0].id; // Loop back to the beginning
    } else {
      nextPlayerId = players[playerIndex + 1].id;
    }

    res.render('detail', { player, isAdmin, nextPlayerId });
  } else {
    res.status(404).send('Invalid Player ID');
  }
});

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

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/overview',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const userExists = await usersCollection.findOne({ username });
  if (userExists) {
    return res.status(409).send('Username already exists');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await usersCollection.insertOne({ username, password: hashedPassword, role: 'USER' });
  res.redirect('/login');
});

app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.redirect('/login');
  });
});

app.get('/edit/:id', ensureLoggedIn, ensureAdmin, async (req, res) => {
  const playerId = req.params.id;

  try {
    const player = await playersCollection.findOne({ _id: new ObjectId(playerId) });

    if (player) {
      res.render('edit', { player });
    } else { 
      res.status(404).send('Player not found');
    }
  } catch (error) {
    console.error('Error finding player:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.post('/edit/:id', ensureLoggedIn, ensureAdmin, async (req, res) => {
  const playerId = req.params.id;
  const updatedPlayer: Partial<Player> = { // Gebruik Partial<Player> om aan te geven dat niet alle velden worden bijgewerkt
    name: req.body.name,
    age: parseInt(req.body.age),
    position: req.body.position,
    nationality: req.body.nationality,
    overallRating: parseInt(req.body.overallRating),
    isActive: req.body.isActive === 'on',
    birthDate: req.body.birthDate,
    club: {
      name: req.body.club,
      league: req.body.league
    },
    imageURL: req.body.imageURL
  };

  try {
    // Gebruik de updateOne-methode om de speler bij te werken zonder het _id-veld expliciet op te nemen
    await playersCollection.updateOne({ _id: new ObjectId(playerId) }, { $set: updatedPlayer });
    res.redirect('/overview');
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
