import { createCrudRouter } from '../lib/crud.js';
import { optionalAuth } from '../auth.js';
import express from 'express';

const router = express.Router();
router.use(optionalAuth);

const crud = createCrudRouter({
  table: 'pages',
  booleanFields: ['in_footer_menu'],
});
router.use('/', crud);

export default router;