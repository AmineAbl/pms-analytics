require('dotenv').config();

module.exports = {
  schema: './schema/*',
  out: './drizzle/',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
