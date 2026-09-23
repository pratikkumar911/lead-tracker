import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z } from 'zod';
import { Lead, LEAD_STATUSES } from './Lead';

/** Thrown by handlers when the request is valid but cannot be fulfilled. */
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

/** Forwards async rejections to the Express error middleware. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    fn(req, res).catch(next);

/** Escapes user input before using it in a RegExp. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- Validation schemas ----------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\-\s0-9]{7,20}$/, 'Enter a valid phone number (7-20 digits)'),
  status: z.enum(LEAD_STATUSES).optional(),
});

const updateSchema = createSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update' },
);

const statusSchema = z.object({ status: z.enum(LEAD_STATUSES) });

const querySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  '-name': { name: -1 },
};

const sortSchema = z.enum(['newest', 'oldest', 'name', '-name']).default('newest');

const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead id');

// --- Router ----------------------------------------------------------------

export const leadsRouter = Router();

// GET /api/leads/stats — must be registered before /:id
leadsRouter.get(
  '/stats',
  wrap(async (_req, res) => {
    const grouped = await Lead.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(grouped.map((r) => [r._id, r.count]));
    const total = grouped.reduce((sum, r) => sum + r.count, 0);
    res.json({ success: true, data: { total, byStatus } });
  }),
);

// GET /api/leads
leadsRouter.get(
  '/',
  wrap(async (req, res) => {
    const { search, status, page, limit } = querySchema.parse(req.query);
    const sort = sortSchema.parse(req.query.sort);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort(SORTS[sort])
        .skip((page - 1) * limit)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  }),
);

// POST /api/leads
leadsRouter.post(
  '/',
  wrap(async (req, res) => {
    const payload = createSchema.parse(req.body);

    if (await Lead.exists({ email: payload.email })) {
      throw new AppError(409, 'A lead with this email already exists');
    }

    const lead = await Lead.create(payload);
    res.status(201).json({ success: true, data: lead });
  }),
);

// GET /api/leads/:id
leadsRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const lead = await Lead.findById(id);
    if (!lead) throw new AppError(404, 'Lead not found');
    res.json({ success: true, data: lead });
  }),
);

// PATCH /api/leads/:id
leadsRouter.patch(
  '/:id',
  wrap(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const payload = updateSchema.parse(req.body);

    if (payload.email && (await Lead.exists({ email: payload.email, _id: { $ne: id } }))) {
      throw new AppError(409, 'Another lead already uses this email');
    }

    const lead = await Lead.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!lead) throw new AppError(404, 'Lead not found');
    res.json({ success: true, data: lead });
  }),
);

// PATCH /api/leads/:id/status
leadsRouter.patch(
  '/:id/status',
  wrap(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { status } = statusSchema.parse(req.body);

    const lead = await Lead.findByIdAndUpdate(id, { status }, { new: true });
    if (!lead) throw new AppError(404, 'Lead not found');
    res.json({ success: true, data: lead });
  }),
);

// DELETE /api/leads/:id
leadsRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) throw new AppError(404, 'Lead not found');
    res.json({ success: true, message: 'Lead deleted' });
  }),
);

// --- Error handler ---------------------------------------------------------

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof z.ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err?.name === 'CastError') {
    res.status(400).json({ success: false, message: 'Invalid identifier' });
    return;
  }

  if (err?.code === 11000) {
    res.status(409).json({
      success: false,
      message: 'A record with these details already exists',
    });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}
