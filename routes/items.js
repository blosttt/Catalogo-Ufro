const express = require('express');
const router = express.Router();

// IMPORTAR LA CONEXIÓN A LA BASE DE DATOS
const db = require('../config/database');

// GET - Obtener todos los items
router.get('/', async (req, res) => {
    try {
        const { search, categoria_id, estado } = req.query;
        
        let query = `
            SELECT i.*, c.nombre as categoria_nombre 
            FROM items i 
            LEFT JOIN categorias c ON i.categoria_id = c.id 
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            query += ` AND (i.nombre ILIKE $${paramCount} OR i.codigo_ufro ILIKE $${paramCount} OR i.descripcion ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        if (categoria_id) {
            paramCount++;
            query += ` AND i.categoria_id = $${paramCount}`;
            params.push(categoria_id);
        }

        if (estado) {
            paramCount++;
            query += ` AND i.estado = $${paramCount}`;
            params.push(estado);
        }

        query += ` ORDER BY i.id DESC`;

        console.log('🔍 Ejecutando query:', query, 'Params:', params);
        const items = await db.query(query, params);
        
        console.log(`✅ Se encontraron ${items.length} items`);

        // Procesar imágenes si existen
        const itemsConImagenes = items.map(item => {
            if (item.imagenes && typeof item.imagenes === 'string') {
                try {
                    item.imagenes = JSON.parse(item.imagenes);
                } catch (e) {
                    item.imagenes = [];
                }
            } else if (!item.imagenes) {
                item.imagenes = [];
            }
            return item;
        });

        res.json({
            success: true,
            data: itemsConImagenes
        });

    } catch (error) {
        console.error('❌ Error obteniendo items:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los items',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET - Obtener un item por ID
router.get('/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        
        console.log(`🔍 Buscando item ID: ${itemId}`);

        const item = await db.oneOrNone(`
            SELECT i.*, c.nombre as categoria_nombre 
            FROM items i 
            LEFT JOIN categorias c ON i.categoria_id = c.id 
            WHERE i.id = $1
        `, [itemId]);

        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        console.log(`✅ Item encontrado: ${item.nombre}`);

        // Procesar imágenes
        if (item.imagenes && typeof item.imagenes === 'string') {
            try {
                item.imagenes = JSON.parse(item.imagenes);
            } catch (e) {
                item.imagenes = [];
            }
        } else if (!item.imagenes) {
            item.imagenes = [];
        }

        res.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('❌ Error obteniendo item:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el item',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET - Estadísticas de items
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Solicitando estadísticas...');

        const stats = await db.one(`
            SELECT 
                COUNT(*) as total_items,
                COUNT(CASE WHEN estado = 'bueno' THEN 1 END) as buenos,
                COUNT(CASE WHEN estado = 'regular' THEN 1 END) as regulares,
                COUNT(CASE WHEN estado = 'malo' THEN 1 END) as malos,
                COUNT(CASE WHEN estado = 'inactivo' THEN 1 END) as inactivos
            FROM items
        `);

        console.log('✅ Estadísticas obtenidas:', stats);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las estadísticas',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST - Crear nuevo item
router.post('/', async (req, res) => {
    try {
        const {
            codigo_ufro,
            nombre,
            descripcion,
            categoria_id,
            ubicacion_bodega,
            cantidad,
            estado,
            fecha_adquisicion,
            valor_aproximado,
            marca,
            modelo,
            especificaciones
        } = req.body;

        console.log('📥 Datos recibidos para nuevo item:', req.body);

        // Validaciones básicas
        if (!codigo_ufro || !nombre || !categoria_id || !ubicacion_bodega || !cantidad || !estado) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos obligatorios deben ser completados'
            });
        }

        // Validar tipos de datos
        if (isNaN(parseInt(categoria_id)) || parseInt(categoria_id) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Categoría inválida'
            });
        }

        if (isNaN(parseInt(cantidad)) || parseInt(cantidad) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Cantidad debe ser un número mayor a 0'
            });
        }

        console.log('💾 Intentando guardar en la base de datos...');

        const result = await db.one(`
            INSERT INTO items (
                codigo_ufro, nombre, descripcion, categoria_id, ubicacion_bodega,
                cantidad, estado, fecha_adquisicion, valor_aproximado, marca, modelo, especificaciones
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            codigo_ufro, 
            nombre, 
            descripcion || null, 
            parseInt(categoria_id), 
            ubicacion_bodega,
            parseInt(cantidad), 
            estado, 
            fecha_adquisicion || null, 
            valor_aproximado ? parseFloat(valor_aproximado) : null, 
            marca || null, 
            modelo || null, 
            especificaciones || null
        ]);

        console.log('✅ Item creado exitosamente:', result);

        res.json({
            success: true,
            message: 'Item creado exitosamente',
            data: result
        });

    } catch (error) {
        console.error('❌ Error creando item:', error);
        
        if (error.code === '23505') { // Violación de unique constraint
            return res.status(400).json({
                success: false,
                error: 'El código UFRO ya existe'
            });
        }

        if (error.code === '23503') { // Violación de clave foránea
            return res.status(400).json({
                success: false,
                error: 'La categoría seleccionada no existe'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al crear el item',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE - Eliminar un item
router.delete('/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        
        console.log(`🗑️ Solicitando eliminar item ID: ${itemId}`);
        
        // Validar ID
        if (isNaN(itemId) || itemId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'ID de item inválido'
            });
        }

        // Verificar si el item existe
        const itemExistente = await db.oneOrNone('SELECT id, nombre FROM items WHERE id = $1', [itemId]);
        
        if (!itemExistente) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        console.log(`🔍 Item encontrado: ${itemExistente.nombre} (ID: ${itemId})`);

        // ELIMINAR DE LA BASE DE DATOS
        const result = await db.query('DELETE FROM items WHERE id = $1 RETURNING id, nombre', [itemId]);
        
        if (result.rowCount === 0) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo eliminar el item de la base de datos'
            });
        }

        console.log(`✅ Item eliminado: ${result[0].nombre} (ID: ${result[0].id})`);
        
        res.json({
            success: true,
            message: `Item "${result[0].nombre}" eliminado correctamente`,
            data: { 
                id: result[0].id,
                nombre: result[0].nombre
            }
        });

    } catch (error) {
        console.error('❌ Error eliminando item:', error);
        
        // Manejar errores de base de datos
        if (error.code === '23503') { // Violación de clave foránea
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar el item porque tiene registros relacionados en otras tablas'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al eliminar el item',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;