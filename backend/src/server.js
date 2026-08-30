import 'dotenv/config';
import { networkInterfaces } from 'node:os';
import { creerApp } from './app.js';
import { prisma } from './lib/prisma.js';

const port = Number(process.env.PORT) || 4000;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant. Copiez .env.example vers .env et renseignez-le.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET manquant. Copiez .env.example vers .env et renseignez-le.');
  process.exit(1);
}

/** Adresses IPv4 du reseau local, celles que le telephone peut joindre. */
function adressesReseau() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

// 0.0.0.0 et non localhost : sinon le serveur n'ecoute que sur la machine, et
// le telephone recoit "impossible de joindre le serveur" sans autre indice.
const serveur = creerApp().listen(port, '0.0.0.0', () => {
  console.log(`API Senyi sur http://localhost:${port}`);
  for (const ip of adressesReseau()) {
    console.log(`  depuis le telephone (meme Wi-Fi) : http://${ip}:${port}`);
  }
});

// Arret propre : on ferme les connexions avant de rendre la main.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n${signal} recu, arret en cours...`);
    serveur.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
