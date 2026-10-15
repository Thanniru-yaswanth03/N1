import { Router } from 'express';
import { healthRouter } from './health.router.js';
import { dropRouter } from './drop.router.js';
import { boardRouter } from './board.router.js';
import { duelRouter } from './duel.router.js';
import { adminRouter } from './admin.router.js';

export const apiRouter = Router();

// Mount health router at /health
apiRouter.use('/health', healthRouter);

// Mount drop router at /drop and /drops
apiRouter.use('/drop', dropRouter);
apiRouter.use('/drops', dropRouter);

// Mount board router at /board
apiRouter.use('/board', boardRouter);

// Mount duel router at /duel
apiRouter.use('/duel', duelRouter);

// Mount private admin router at /admin
apiRouter.use('/admin', adminRouter);

