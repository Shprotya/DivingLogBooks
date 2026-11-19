import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { isValidId } from '../utils/request_helpers';

// Checks the id in the URL before the body is validated,
// so a missing resource gives 404 even when the body is also invalid
export const requireExisting = (model: Model<any>, name: string) =>
    async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
        const { id } = req.params;

        if (!isValidId(id)) {
            res.status(400).json({ message: `Invalid ${name.toLowerCase()} id` });
            return;
        }

        if (!(await model.exists({ _id: id }))) {
            res.status(404).json({ message: `${name} with id ${id} not found` });
            return;
        }

        next();
    };