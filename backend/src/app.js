import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import configRoutes from './routes/config.routes.js';
import compteRoutes from './routes/compte.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import tourneesRoutes from './routes/tournees.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import bannieresRoutes from './routes/bannieres.routes.js';
import abonnementsRoutes from './routes/abonnements.routes.js';
import bacsRoutes from './routes/bacs.routes.js';
import missionsRoutes from './routes/missions.routes.js';
import paiementsRoutes from './routes/paiements.routes.js';
import pointsRoutes from './routes/points.routes.js';
import triRoutes from './routes/tri.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
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
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) =>
    res.json({ service: 'cleanguinea-api', statut: 'ok', heure: new Date().toISOString() }),
  );

  app.use('/api/config', configRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/compte', compteRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/bacs', bacsRoutes);
  app.use('/api/tournees', tourneesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/bannieres', bannieresRoutes);
  app.use('/api/abonnements', abonnementsRoutes);
  app.use('/api/missions', missionsRoutes);
  app.use('/api/paiements', paiementsRoutes);
  app.use('/api/points', pointsRoutes);
  app.use('/api/tri', triRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(nonTrouve);
  app.use(gestionErreurs);

  return app;
}
