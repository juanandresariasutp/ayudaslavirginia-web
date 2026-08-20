/**
 * Script de utilería para migrar y comprimir imágenes existentes a WebP.
 * 
 * Uso local:
 *   node scripts/compress-existing-images.js ./public/images
 *
 * Requiere (opcional): npm install sharp
 */

import fs from 'node:fs'
import path from 'node:path'

console.log('====================================================')
console.log('  OPTIMIZADOR DE IMÁGENES EXISTENTES A FORMATO WEBP')
console.log('====================================================\n')

const targetDir = process.argv[2] || './public'

if (!fs.existsSync(targetDir)) {
  console.error(`❌ El directorio "${targetDir}" no existe.`)
  process.exit(1)
}

async function processDirectory(directory) {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.log('ℹ️ Para usar este script en Node.js, instala la librería de compresión ultra rápida "sharp":')
    console.log('👉 npm install -D sharp\n')
    console.log('💡 NOTA: Para imágenes NUEVAS que los usuarios suban a la web desde su celular o galería,')
    console.log('   la plataforma YA realiza la conversión automática a .webp en el navegador (Canvas HTML5)')
    console.log('   antes de enviarlas a Supabase o guardar datos, reduciendo el peso de ~10MB a ~200KB.\n')
    return
  }

  const files = fs.readdirSync(directory)
  let count = 0

  for (const file of files) {
    const filePath = path.join(directory, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      await processDirectory(filePath)
    } else if (/\.(png|jpe?g)$/i.test(file)) {
      const ext = path.extname(file)
      const webpPath = filePath.replace(new RegExp(`${ext}$`, 'i'), '.webp')

      try {
        await sharp(filePath)
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(webpPath)

        const oldSize = (stat.size / 1024).toFixed(1)
        const newSize = (fs.statSync(webpPath).size / 1024).toFixed(1)
        console.log(`✅ Convertido: ${file} (${oldSize} KB) ➔ ${path.basename(webpPath)} (${newSize} KB)`)
        count++
      } catch (err) {
        console.error(`❌ Error procesando ${file}:`, err.message)
      }
    }
  }

  if (count > 0) {
    console.log(`\n🎉 ¡Optimización completada! ${count} imágenes convertidas a .webp`)
  }
}

processDirectory(targetDir)
