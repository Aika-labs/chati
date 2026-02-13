import { Router } from 'express';
import { teamController } from './team.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Team member CRUD
router.get('/', teamController.list);
router.get('/stats', teamController.getStats);
router.get('/available', teamController.getAvailableAgents);
router.get('/:id', teamController.get);
router.post('/', teamController.create);
router.patch('/:id', teamController.update);
router.delete('/:id', teamController.delete);

// Assignment operations
router.post('/assign', teamController.assignConversation);
router.post('/unassign', teamController.unassignConversation);

// Availability
router.post('/availability', teamController.setAvailability);

export const teamRoutes = router;
