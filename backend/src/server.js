import 'dotenv/config';
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

const serveur = creerApp().listen(port, () => {
  console.log(`API Clean Guinee sur http://localhost:${port}`);
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
