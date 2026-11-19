import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: z.ZodType) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // safeParseAsync is needed because the dive schema now has a check 
        // that awaits the database
        const validation = await schema.safeParseAsync(req.body);

        if (!validation.success) {
            res.status(400).json({
                message: 'Validation failed',
                errors: validation.error.issues,
            });
            return;
        }

        req.body = validation.data;
        next();
    };