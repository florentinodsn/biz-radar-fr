import { closeDatabase, initDatabase, countDeals } from "../services/database.js";

initDatabase();
console.log(`✓ Base SQLite initialisée (${countDeals()} deal(s)).`);
closeDatabase();
