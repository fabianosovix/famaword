import { createCrudRouter } from '../lib/crud.js';
import { optionalAuth } from '../auth.js';
import express from 'express';

const router = express.Router();
router.use(optionalAuth);

const crud = createCrudRouter({ table: 'editors' });
router.use('/', crud);

export default router;