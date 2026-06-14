import { ApiError } from '../utils/ApiError.js';

/**
 * Generic request-body validator using a zod schema.
 * On success, replaces req.body with the parsed (typed/coerced) data.
 * On failure, throws a 400 ApiError with a readable message.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return next(new ApiError(400, message));
  }

  req.body = result.data;
  next();
};
