/**
 * Global Express error-handling middleware.
 * Must be registered AFTER all routes with app.use(errorHandler).
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[ERROR] ${req.method} ${req.path}:`, err);

    res.status(status).json({ error: message });
};
