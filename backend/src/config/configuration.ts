export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'badrgo',
    password: process.env.DB_PASSWORD ?? 'badrgo_secret',
    name: process.env.DB_NAME ?? 'badrgo_wallet',
  },
});
