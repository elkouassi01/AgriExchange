PostgreSQL migration notes

Current status:
- PostgreSQL connection helper is available in `server/config/postgres.js`
- Initial relational schema is available in `server/sql/postgres-schema.sql`
- Initialization script is available through `npm run db:pg:init`

Recommended next migration order:
1. Users and authentication
2. Products and product images
3. Subscriptions and transactions
4. Product access control and product views
5. Admin dashboard queries
6. Chat/messages

Important:
- The current application logic still depends on MongoDB models.
- This schema is the infrastructure step, not the final full switchover.
- Before production use, add proper migrations, seed scripts, and repositories/services per entity.
