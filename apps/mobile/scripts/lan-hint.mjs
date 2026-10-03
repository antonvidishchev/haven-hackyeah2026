// Prints the API address a phone on the same network should use (Expo Go can't reach 127.0.0.1).
import { networkInterfaces } from 'node:os';

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
  .map((entry) => entry.address);

if (process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.log(`Mobile app uses EXPO_PUBLIC_API_BASE_URL=${process.env.EXPO_PUBLIC_API_BASE_URL}`);
} else if (addresses.length > 0) {
  console.log('For a physical phone, set this in apps/mobile/.env and restart:');
  for (const address of addresses) {
    console.log(`  EXPO_PUBLIC_API_BASE_URL=http://${address}:3001/api/v1`);
  }
} else {
  console.log('No LAN address found; the app will use http://127.0.0.1:3001/api/v1.');
}
