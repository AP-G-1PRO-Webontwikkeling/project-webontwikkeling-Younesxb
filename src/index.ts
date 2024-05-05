import express, { Request, Response } from 'express';
import path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import { Player } from '../Interfaces/Interface';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI: string | undefined = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

const client = new MongoClient("mongodb+srv://Younes:APHogeschool@clusterofyounes.4temuqa.mongodb.net/ClusterOfYounes");
let db: Db;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

async function importPlayersDataToMongoDB() {
    try {
        const playersDataPath = path.join(__dirname, '../players.json');
        const playersData = await fs.promises.readFile(playersDataPath, 'utf-8');
        const parsedPlayersData = JSON.parse(playersData);

        const collection = db.collection('players');
        const result = await collection.insertMany(parsedPlayersData);
        console.log(`${result.insertedCount} documents were inserted into the players collection.`);
    } catch (error) {
        console.error(`Error importing players data to MongoDB: ${error}`);
    }
}

connectToMongoDB()
    .then(() => importPlayersDataToMongoDB())
    .catch(error => console.error('Failed to import players data:', error));

app.set('view engine', 'ejs');
app.use(express.static("public"));

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

app.get('/', (req, res) => {
    res.render('index', { players }); 
});

app.get('/detail/:id', (req, res) => {
    const playerId = req.params.id;
    const player = players.find(player => player.id === playerId); 
    res.render('detail', { player });
});

app.get('/overview', (req, res) => {
    const sortAttribute: keyof Player = req.query.sortAttribute as keyof Player || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1; 

    const sortedPlayers = [...players]; 

    sortedPlayers.sort((a, b) => {
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
