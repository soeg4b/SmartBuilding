import { Router } from 'express';

import authRoutes from './auth/auth.routes';
import usersRoutes from './users/users.routes';
import energyRoutes from './energy/energy.routes';
import { sensorsRouter, zonesRouter } from './environmental/environmental.routes';
import assetsRoutes from './assets/assets.routes';
import { buildingsRouter, floorsRouter, floorPlansRouter } from './spatial/spatial.routes';
import { alertRulesRouter, alertsRouter, notificationsRouter } from './alerts/alerts.routes';
import dashboardRoutes from './dashboard/dashboard.routes';

const router = Router();

// Auth & Users
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

// Energy
router.use('/energy', energyRoutes);

// Environmental (Sensors & Zones)
router.use('/sensors', sensorsRouter);
router.use('/zones', zonesRouter);

// Assets / Equipment
router.use('/equipment', assetsRoutes);

// Spatial (Buildings, Floors, Floor Plans)
router.use('/buildings', buildingsRouter);
router.use('/floors', floorsRouter);
router.use('/floor-plans', floorPlansRouter);

// Alerts & Notifications
router.use('/alert-rules', alertRulesRouter);
router.use('/alerts', alertsRouter);
router.use('/notifications', notificationsRouter);

// Dashboard
router.use('/dashboard', dashboardRoutes);

export default router;
