const Item = require('../models/Item');
const { validationResult } = require('express-validator');

const itemsController = {
    // Obtener todos los items
    async getItems(req, res) {
        try {
            console.log('🔍 Solicitando items con filtros:', req.query);
            
            const filters = {
                categoria_id: req.query.categoria_id,
                estado: req.query.estado,
                ubicacion: req.query.ubicacion,
                search: req.query.search
            };

            const items = await Item.findAll(filters);
            
            res.json({
                success: true,
                data: items,
                total: items.length,
                message: `Se encontraron ${items.length} items`
            });
        } catch (error) {
            console.error('❌ Error en getItems:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener los items',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // Obtener item por ID
    async getItemById(req, res) {
        try {
            const item = await Item.findById(req.params.id);
            
            if (!item) {
                return res.status(404).json({
                    success: false,
                    error: 'Item no encontrado'
                });
            }

            res.json({
                success: true,
                data: item
            });
        } catch (error) {
            console.error('❌ Error en getItemById:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener el item'
            });
        }
    },

    // Crear nuevo item
    async createItem(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const itemData = {
                codigo_ufro: req.body.codigo_ufro,
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                categoria_id: req.body.categoria_id,
                ubicacion_bodega: req.body.ubicacion_bodega,
                cantidad: req.body.cantidad,
                estado: req.body.estado,
                fecha_adquisicion: req.body.fecha_adquisicion,
                valor_aproximado: req.body.valor_aproximado
            };

            const nuevoItem = await Item.create(itemData);

            res.status(201).json({
                success: true,
                message: 'Item creado exitosamente',
                data: nuevoItem
            });
        } catch (error) {
            console.error('❌ Error en createItem:', error);
            
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'El código UFRO ya existe'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Error al crear el item'
            });
        }
    },

    // Obtener estadísticas
    async getStats(req, res) {
        try {
            const stats = await Item.getStats();
            res.json({
                success: true,
                data: stats,
                message: 'Estadísticas obtenidas correctamente'
            });
        } catch (error) {
            console.error('❌ Error en getStats:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener estadísticas'
            });
        }
    }
};

module.exports = itemsController;