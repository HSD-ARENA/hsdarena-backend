export default () => ({
    port: parseInt(process.env.PORT || '8080', 10),
    jwtAdminSecret: process.env.JWT_ADMIN_SECRET,
    jwtTeamSecret: process.env.JWT_TEAM_SECRET,
    jwtExpAdmin: process.env.JWT_EXP_ADMIN || '90m',
    jwtExpTeam: process.env.JWT_EXP_TEAM || '90m',
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL
    });