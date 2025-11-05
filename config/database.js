// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'catalogo_ufro',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Verificar conexión
db.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.stack);
    } else {
        console.log('✅ Conexión a PostgreSQL establecida correctamente');
        release();
    }
});

// Función para ejecutar consultas
db.query = async (text, params) => {
    const client = await db.connect();
    try {
        const result = await client.query(text, params);
        return result.rows;
    } finally {
        client.release();
    }
};

// Función para obtener un solo registro
db.one = async (text, params) => {
    const results = await db.query(text, params);
    if (results.length === 0) {
        throw new Error('No se encontraron resultados');
    }
    return results[0];
};

// Función para obtener un registro o null
db.oneOrNone = async (text, params) => {
    const results = await db.query(text, params);
    return results.length > 0 ? results[0] : null;
};

module.exports = db;