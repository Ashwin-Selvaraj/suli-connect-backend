import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import domainsRoutes from './modules/domains/domains.routes';
import teamsRoutes from './modules/teams/teams.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import verificationRoutes from './modules/verification/verification.routes';
import reputationRoutes from './modules/reputation/reputation.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/domains', domainsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/admin', adminRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SULI Connect API running on http://localhost:${PORT}`);
});
