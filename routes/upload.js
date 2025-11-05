const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configurar multer para Windows
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        
        // Asegurar que el directorio existe (específico para Windows)
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Nombre seguro para Windows
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'item-' + uniqueSuffix + '-' + safeName);
    }
});

const fileFilter = (req, file, cb) => {
    // Validar tipos de archivo para Windows
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB límite
    }
});

// Ruta para subir imágenes
router.post('/image', upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ninguna imagen válida'
            });
        }

        // Ruta relativa para Windows
        const filePath = `/uploads/${req.file.filename}`;

        console.log('✅ Imagen subida en Windows:', req.file.filename);

        res.json({
            success: true,
            message: 'Imagen subida exitosamente',
            filename: req.file.filename,
            path: filePath,
            size: req.file.size
        });
    } catch (error) {
        console.error('❌ Error subiendo imagen en Windows:', error);
        res.status(500).json({
            success: false,
            error: 'Error al subir la imagen: ' + error.message
        });
    }
});

module.exports = router;