const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Crear directorio de uploads si no existe (específico para Windows)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Directorio uploads creado para Windows');
}

// Middlewares
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos - rutas Windows
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Importar rutas
app.use('/api/items', require('./routes/items'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/upload', require('./routes/upload'));

// Ruta para el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Ruta de salud para verificar que el servidor funciona
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor Catalogo UFRO funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Ruta para verificar la base de datos
app.get('/api/db-check', async (req, res) => {
    try {
        // Verificar conexión a la base de datos
        const db = require('./config/database');
        const result = await db.one('SELECT NOW() as current_time');
        
        res.json({
            success: true,
            message: 'Conexión a la base de datos exitosa',
            database_time: result.current_time
        });
    } catch (error) {
        console.error('❌ Error de conexión a la base de datos:', error);
        res.status(500).json({
            success: false,
            error: 'Error de conexión a la base de datos',
            details: error.message
        });
    }
});

// Manejo de errores mejorado para Windows
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err.stack);
    
    // Errores específicos de Windows
    if (err.code === 'EACCES') {
        return res.status(500).json({ 
            success: false,
            error: 'Error de permisos en Windows',
            message: 'El servidor no tiene permisos para acceder a los recursos'
        });
    }
    
    if (err.code === 'EADDRINUSE') {
        return res.status(500).json({ 
            success: false,
            error: 'Puerto en uso',
            message: 'El puerto 3000 está siendo usado por otra aplicación'
        });
    }

    res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal en el servidor'
    });
});

// Manejo de rutas no encontradas - FORMA CORRECTA PARA WINDOWS
app.use((req, res) => {
    console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    
    res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        message: `La ruta ${req.method} ${req.originalUrl} no existe en el servidor`
    });
});

const PORT = process.env.PORT || 3000;

// Función para verificar que todas las rutas necesarias estén disponibles
function verificarRutas() {
    const rutasEsperadas = [
        'GET /api/items',
        'POST /api/items', 
        'GET /api/items/:id',
        'DELETE /api/items/:id',
        'GET /api/items/stats',
        'GET /api/categorias',
        'POST /api/upload'
    ];
    
    console.log('🔍 Verificando rutas disponibles:');
    rutasEsperadas.forEach(ruta => {
        console.log(`   ✅ ${ruta}`);
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 Servidor Catalogo UFRO iniciado en Windows
    📍 URL: http://localhost:${PORT}
    📁 Entorno: ${process.env.NODE_ENV || 'development'}
    🗄️ Base de datos: ${process.env.DB_NAME || 'No configurada'}
    ⏰ Iniciado: ${new Date().toLocaleString()}
    `);
    
    // Verificar rutas disponibles
    verificarRutas();
    
    // Mensajes específicos para Windows
    console.log('\n💡 Mensajes para Windows:');
    console.log('   • Si tienes problemas de firewall, permite Node.js en el firewall de Windows');
    console.log('   • Para detener el servidor: Ctrl + C');
    console.log('   • Para reiniciar después de cambios: npm run dev');
    console.log('\n📋 Rutas disponibles:');
    console.log('   • http://localhost:3000/ - Frontend');
    console.log('   • http://localhost:3000/health - Estado del servidor');
    console.log('   • http://localhost:3000/api/db-check - Verificar base de datos');
    console.log('   • http://localhost:3000/api/items - API de items');
    console.log('   • http://localhost:3000/api/categorias - API de categorías');
});