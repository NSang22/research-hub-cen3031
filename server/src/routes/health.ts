import { Router, Request, Response } from 'express';
import { ApiResponse } from '@research-hub/shared';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

export default router;
