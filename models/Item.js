const pool = require('../config/database');

class Item {
    // Crear nuevo item
    static async create(itemData) {
        const {
            codigo_ufro,
            nombre,
            descripcion,
            categoria_id,
            ubicacion_bodega,
            cantidad,
            estado,
            fecha_adquisicion,
            valor_aproximado
        } = itemData;

        const query = `
            INSERT INTO items (
                codigo_ufro, nombre, descripcion, categoria_id, 
                ubicacion_bodega, cantidad, estado, fecha_adquisicion, valor_aproximado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            codigo_ufro, nombre, descripcion, categoria_id,
            ubicacion_bodega, cantidad, estado, fecha_adquisicion, valor_aproximado
        ];

        try {
            const result = await pool.query(query, values);
            console.log('✅ Item creado en Windows:', result.rows[0].codigo_ufro);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error creando item en Windows:', error.message);
            throw error;
        }
    }

    // Obtener todos los items con información relacionada
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                i.*,
                c.nombre as categoria_nombre,
                array_remove(array_agg(DISTINCT im.ruta_imagen), NULL) as imagenes,
                ft.marca, ft.modelo,
                COUNT(DISTINCT m.id) as total_movimientos
            FROM items i
            LEFT JOIN categorias c ON i.categoria_id = c.id
            LEFT JOIN imagenes_items im ON i.id = im.item_id
            LEFT JOIN fichas_tecnicas ft ON i.id = ft.item_id
            LEFT JOIN movimientos_inventario m ON i.id = m.item_id
        `;

        const values = [];
        const conditions = [];

        // Aplicar filtros
        if (filters.categoria_id) {
            conditions.push(`i.categoria_id = $${values.length + 1}`);
            values.push(filters.categoria_id);
        }

        if (filters.estado) {
            conditions.push(`i.estado = $${values.length + 1}`);
            values.push(filters.estado);
        }

        if (filters.ubicacion) {
            conditions.push(`i.ubicacion_bodega = $${values.length + 1}`);
            values.push(filters.ubicacion);
        }

        if (filters.search) {
            conditions.push(`(
                i.nombre ILIKE $${values.length + 1} OR 
                i.descripcion ILIKE $${values.length + 1} OR
                i.codigo_ufro ILIKE $${values.length + 1}
            )`);
            values.push(`%${filters.search}%`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` GROUP BY i.id, c.nombre, ft.marca, ft.modelo
                   ORDER BY i.created_at DESC`;

        try {
            const result = await pool.query(query, values);
            console.log(`📊 Items encontrados en Windows: ${result.rows.length}`);
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo items en Windows:', error.message);
            throw error;
        }
    }

    // Obtener item por ID
    static async findById(id) {
        const query = `
            SELECT 
                i.*,
                c.nombre as categoria_nombre,
                array_remove(array_agg(DISTINCT im.ruta_imagen), NULL) as imagenes,
                ft.*,
                COUNT(DISTINCT m.id) as total_movimientos
            FROM items i
            LEFT JOIN categorias c ON i.categoria_id = c.id
            LEFT JOIN imagenes_items im ON i.id = im.item_id
            LEFT JOIN fichas_tecnicas ft ON i.id = ft.item_id
            LEFT JOIN movimientos_inventario m ON i.id = m.item_id
            WHERE i.id = $1
            GROUP BY i.id, c.nombre, ft.id
        `;

        try {
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error obteniendo item por ID en Windows:', error.message);
            throw error;
        }
    }

    // Obtener estadísticas
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_items,
                COUNT(CASE WHEN estado = 'disponible' THEN 1 END) as disponibles,
                COUNT(CASE WHEN estado = 'prestado' THEN 1 END) as prestados,
                COUNT(CASE WHEN estado = 'mantenimiento' THEN 1 END) as mantenimiento,
                COUNT(CASE WHEN estado = 'baja' THEN 1 END) as bajas,
                COALESCE(SUM(valor_aproximado), 0) as valor_total
            FROM items
        `;

        try {
            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas en Windows:', error.message);
            throw error;
        }
    }
}

module.exports = Item;