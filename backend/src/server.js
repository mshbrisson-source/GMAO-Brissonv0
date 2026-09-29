const app = require('./app');

const PORT = parseInt(process.env.PORT, 10) || 3000;

const server = app.listen(PORT, () => {
  console.log(`[API] Listening on http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`\n[API] ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('[API] Server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
