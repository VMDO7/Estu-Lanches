import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { uuidParam } from '../../shared/validation.js';
import { listStudentsQuery, updateStudentStatusSchema } from './students.schemas.js';
import { studentsService } from './students.service.js';

/** Gestão de estudantes — exclusiva de administradores. */
export const studentsRouter = Router();

studentsRouter.use(authenticate, authorize('ADMIN'));

studentsRouter.get('/', async (req, res) => {
  const query = listStudentsQuery.parse(req.query);
  res.json(await studentsService.list(query));
});

studentsRouter.get('/:id', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  res.json({ data: await studentsService.get(id) });
});

studentsRouter.patch('/:id/status', async (req, res) => {
  const { id } = uuidParam.parse(req.params);
  const { isActive } = updateStudentStatusSchema.parse(req.body);
  res.json({ data: await studentsService.setActive(id, isActive) });
});
