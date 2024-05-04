import express, { Request, Response } from 'express';
import path from 'path';
import * as fs from 'fs';
import { Player } from '../Interfaces/Interface';

const app = express();

app.set('view engine', 'ejs');

app.use(express.static("public"));

const playersFilePath = path.join(__dirname, '../players.json'); // Update het pad naar players.json

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
    res.render('index', { players }); // Geef de geladen spelers door aan de index-weergave
});

app.get('/detail/:id', (req, res) => {
    const playerId = req.params.id;
    const player = players.find(player => player.id === playerId); 
    res.render('detail', { player });
});

app.get('/overview', (req, res) => {
    const sortAttribute: keyof Player = req.query.sortAttribute as keyof Player || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1; 

    const sortedPlayers = [...players]; // Maak een kopie van de spelersarray om te sorteren

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

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
