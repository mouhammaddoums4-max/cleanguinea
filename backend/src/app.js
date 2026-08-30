import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import {
  limiteAuth,
  limiteGenerale,
  limiteSms,
  limiteSync,
} from './middleware/limites.js';
import authRoutes from './routes/auth.routes.js';
import configRoutes from './routes/config.routes.js';
import motDePasseRoutes from './routes/mot-de-passe.routes.js';
import compteRoutes from './routes/compte.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import tourneesRoutes from './routes/tournees.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import bannieresRoutes from './routes/bannieres.routes.js';
import abonnementsRoutes from './routes/abonnements.routes.js';
import collecteursRoutes from './routes/collecteurs.routes.js';
import syncRoutes from './routes/sync.routes.js';
import televersementRoutes from './routes/televersement.routes.js';
import bacsRoutes from './routes/bacs.routes.js';
import missionsRoutes from './routes/missions.routes.js';
import paiementsRoutes from './routes/paiements.routes.js';
import pointsRoutes from './routes/points.routes.js';
import triRoutes from './routes/tri.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import supportRoutes from './routes/support.routes.js';
import { nonTrouve, gestionErreurs } from './middleware/erreurs.js';

export function creerApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' })); // marge pour les photos en base64

  // Derriere Railway, l'IP du client est dans X-Forwarded-For. Sans ce reglage,
  // tout le trafic parait venir du proxy et les limiteurs bloqueraient tout le
  // monde d'un coup au lieu du seul attaquant.
  app.set('trust proxy', 1);
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) =>
    res.json({ service: 'cleanguinea-api', statut: 'ok', heure: new Date().toISOString() }),
  );

  // Filet general, pose avant les routes pour couvrir aussi celles a venir.
  app.use('/api', limiteGenerale);

  app.use('/api/config', configRoutes);
  app.use('/api/auth', limiteAuth, authRoutes);
  app.use('/api/mot-de-passe', limiteSms, motDePasseRoutes);
  app.use('/api/compte', compteRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/bacs', bacsRoutes);
  app.use('/api/tournees', tourneesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/bannieres', bannieresRoutes);
  app.use('/api/abonnements', abonnementsRoutes);
  app.use('/api/collecteurs', collecteursRoutes);
  app.use('/api/sync', limiteSync, syncRoutes);
  app.use('/api/televersement', televersementRoutes);
  app.use('/api/missions', missionsRoutes);
  app.use('/api/paiements', paiementsRoutes);
  app.use('/api/points', pointsRoutes);
  app.use('/api/tri', triRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/support', supportRoutes);

  app.use(nonTrouve);
  app.use(gestionErreurs);

  return app;
}
