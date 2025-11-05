const pool = require('../config/database');

class Categoria {
    // Obtener todas las categorías
    static async findAll() {
        try {
            const query = 'SELECT * FROM categorias ORDER BY nombre';
            const result = await pool.query(query);
            console.log(`📊 Categorías encontradas: ${result.rows.length}`);
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo categorías:', error);
            throw error;
        }
    }

    // Obtener categoría por ID
    static async findById(id) {
        try {
            const query = 'SELECT * FROM categorias WHERE id = $1';
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error obteniendo categoría por ID:', error);
            throw error;
        }
    }

    // Crear nueva categoría
    static async create(nombre, descripcion) {
        try {
            const query = `
                INSERT INTO categorias (nombre, descripcion) 
                VALUES ($1, $2) 
                RETURNING *
            `;
            const result = await pool.query(query, [nombre, descripcion]);
            console.log('✅ Categoría creada:', result.rows[0].nombre);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error creando categoría:', error);
            throw error;
        }
    }

    // Actualizar categoría
    static async update(id, nombre, descripcion) {
        try {
            const query = `
                UPDATE categorias 
                SET nombre = $1, descripcion = $2 
                WHERE id = $3 
                RETURNING *
            `;
            const result = await pool.query(query, [nombre, descripcion, id]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error actualizando categoría:', error);
            throw error;
        }
    }

    // Eliminar categoría
    static async delete(id) {
        try {
            const query = 'DELETE FROM categorias WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error eliminando categoría:', error);
            throw error;
        }
    }

    // Obtener categorías con conteo de items
    static async findAllWithCount() {
        try {
            const query = `
                SELECT 
                    c.*,
                    COUNT(i.id) as total_items
                FROM categorias c
                LEFT JOIN items i ON c.id = i.categoria_id
                GROUP BY c.id
                ORDER BY c.nombre
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('❌ Error obteniendo categorías con conteo:', error);
            throw error;
        }
    }
}

module.exports = Categoria;