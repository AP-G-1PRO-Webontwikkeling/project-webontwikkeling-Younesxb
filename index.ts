
import { Player } from './Interface';
import * as readlineSync from 'readline-sync';
import * as fs from 'fs';

function loadJSONData(filename: string): Player[] {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON file: ${error}`);
    return [];
  }
}

function displayAllPlayers(players: Player[]): void {
  console.log("\nFIFA Player Data:");
  players.forEach(player => {
    console.log(`- ${player.name} (${player.id})`);
  });
}

function filterPlayerByID(players: Player[], id: string): Player | undefined {
  return players.find(player => player.id === id);
}

function displayPlayerDetails(player: Player): void {
  console.log(`- ${player.name} (${player.id})`);
  console.log(`  Position: ${player.position}`);
  console.log(`  Overall Rating: ${player.overallRating}`);
  console.log(`  Active: ${player.isActive}`);
  console.log(`  Birth Date: ${player.birthDate}`);
  console.log(`  Nationality: ${player.nationality}`);
  console.log(`  Club: ${player.club.name} (${player.club.league})`);
}

function startApp(): void {
  const players = loadJSONData('players.json');

  let choice = 0;

  do {
    console.log("\nWelcome to the FIFA Player Data Viewer!");
    console.log("1. View all players");
    console.log("2. Filter player by ID");
    console.log("3. Exit");
    choice = readlineSync.questionInt("Please enter your choice: ");

    switch (choice) {
      case 1:
        displayAllPlayers(players);
        break;
      case 2:
        const id = readlineSync.question("Please enter the ID of the player: ");
        const filteredPlayer = filterPlayerByID(players, id);
        if (filteredPlayer) {
          console.log("Player found:");
          displayPlayerDetails(filteredPlayer);
        } else {
          console.log(`No player found with ID ${id}`);
        }
        break;
      case 3:
        console.log("Exiting the application. Goodbye!");
        break;
      default:
        console.log("Invalid choice. Please try again.");
    }
  } while (choice !== 3);
}


startApp();





