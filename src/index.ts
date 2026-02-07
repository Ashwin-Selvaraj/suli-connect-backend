import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { authConfig } from './modules/auth/config';
import { globalAuthMiddleware } from './common/guards/global-auth.middleware';
import authRoutes from './modules/auth/auth.routes';
import * as webappAuthController from './modules/auth/controllers/webapp-auth.controller';
import * as webappLinkController from './modules/auth/controllers/webapp-link.controller';
import usersRoutes from './modules/users/users.routes';
import domainsRoutes from './modules/domains/domains.routes';
import teamsRoutes from './modules/teams/teams.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import verificationRoutes from './modules/verification/verification.routes';
import reputationRoutes from './modules/reputation/reputation.routes';
import adminRoutes from './modules/admin/admin.routes';
import onboardingRoutes from './modules/onboarding/onboarding.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

const frontendUrl = authConfig.frontendUrl;
const corsOrigins = [frontendUrl];
if (frontendUrl.includes('localhost')) {
  corsOrigins.push(frontendUrl.replace('localhost', '127.0.0.1'));
}
app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Global auth - protects all /api/* routes except public (sign-in, OAuth, OTP, wallet, etc.)
app.use(globalAuthMiddleware);

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/webapp/auth', webappAuthController.startOAuth);
app.get('/webapp/auth/google/callback', webappLinkController.googleCallback);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/domains', domainsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/onboarding', onboardingRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SULI Connect API running on http://localhost:${PORT}`);
});
