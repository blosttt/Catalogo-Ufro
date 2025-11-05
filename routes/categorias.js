const express = require('express');
const router = express.Router();

// IMPORTAR LA CONEXIÓN A LA BASE DE DATOS - ESTA LÍNEA FALTA
const db = require('../config/database'); // Ajusta la ruta según tu estructura

// GET - Obtener todas las categorías
router.get('/', async (req, res) => {
    try {
        console.log('📋 Solicitando lista de categorías...');
        
        const categorias = await db.query(`
            SELECT * FROM categorias 
            ORDER BY nombre ASC
        `);

        console.log(`✅ Se encontraron ${categorias.length} categorías`);
        
        res.json({
            success: true,
            data: categorias
        });

    } catch (error) {
        console.error('❌ Error obteniendo categorías:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las categorías',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET - Obtener una categoría por ID
router.get('/:id', async (req, res) => {
    try {
        const categoriaId = parseInt(req.params.id);
        
        const categoria = await db.oneOrNone(`
            SELECT * FROM categorias 
            WHERE id = $1
        `, [categoriaId]);

        if (!categoria) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada'
            });
        }

        res.json({
            success: true,
            data: categoria
        });

    } catch (error) {
        console.error('Error obteniendo categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la categoría'
        });
    }
});

// POST - Crear nueva categoría
router.post('/', async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).json({
                success: false,
                error: 'El nombre de la categoría es obligatorio'
            });
        }

        const result = await db.one(`
            INSERT INTO categorias (nombre, descripcion) 
            VALUES ($1, $2) 
            RETURNING *
        `, [nombre, descripcion]);

        res.json({
            success: true,
            message: 'Categoría creada exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error creando categoría:', error);
        
        if (error.code === '23505') { // Violación de unique constraint
            return res.status(400).json({
                success: false,
                error: 'El nombre de la categoría ya existe'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al crear la categoría'
        });
    }
});

module.exports = router;