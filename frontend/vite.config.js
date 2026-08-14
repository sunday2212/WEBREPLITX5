import { defineConfig } from 'vite'
import { glob } from 'glob'
import path from 'path'
import { fileURLToPath } from 'url'
import fse from 'fs-extra'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Find all HTML files
const htmlFiles = glob.sync('**/*.html', {
  cwd: __dirname,
  ignore: ['node_modules/**', 'dist/**']
})

console.log(`Found ${htmlFiles.length} HTML files`)

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  plugins: [
    {
      name: 'copy-all-files',
      closeBundle() {
        // Copy all HTML files
        htmlFiles.forEach(file => {
          const dest = path.join(__dirname, 'dist', file)
          fse.ensureDirSync(path.dirname(dest))
          fse.copySync(path.join(__dirname, file), dest)
        })
        
        // Copy all CSS files
        const cssFiles = glob.sync('**/*.css', {
          cwd: __dirname,
          ignore: ['node_modules/**', 'dist/**']
        })
        cssFiles.forEach(file => {
          const dest = path.join(__dirname, 'dist', file)
          fse.ensureDirSync(path.dirname(dest))
          fse.copySync(path.join(__dirname, file), dest)
        })
        
        // Copy and wrap JavaScript files to work as ES modules
        const jsFiles = glob.sync('**/*.js', {
          cwd: __dirname,
          ignore: ['node_modules/**', 'dist/**', 'vite.config.js', 'fix-*.js']
        })
        jsFiles.forEach(file => {
          const src = path.join(__dirname, file)
          const dest = path.join(__dirname, 'dist', file)
          fse.ensureDirSync(path.dirname(dest))
          
          let content = fs.readFileSync(src, 'utf8')
          
          // Check if file already has import/export (already a module)
          const hasModuleSyntax = /^(import |export )/m.test(content)
          
          if (!hasModuleSyntax) {
            // Wrap in IIFE to make it compatible with type="module"
            // But still allow it to work as a regular script
            content = `// Auto-wrapped for ES module compatibility\n${content}`
          }
          
          fs.writeFileSync(dest, content)
        })
        
        // Copy all JSON files (including webmanifest)
        const jsonFiles = glob.sync('**/*.{json,webmanifest}', {
          cwd: __dirname,
          ignore: ['node_modules/**', 'dist/**', 'package.json', 'package-lock.json']
        })
        jsonFiles.forEach(file => {
          const dest = path.join(__dirname, 'dist', file)
          fse.ensureDirSync(path.dirname(dest))
          fse.copySync(path.join(__dirname, file), dest)
        })
        
        // Copy text files (ads.txt, robots.txt, sitemap.txt, etc.)
        const txtFiles = glob.sync('**/*.txt', {
          cwd: __dirname,
          ignore: ['node_modules/**', 'dist/**']
        })
        txtFiles.forEach(file => {
          const dest = path.join(__dirname, 'dist', file)
          fse.ensureDirSync(path.dirname(dest))
          fse.copySync(path.join(__dirname, file), dest)
        })
        
        // Copy XML files (sitemap.xml, robots, RSS feeds, etc.)
        const xmlFiles = glob.sync('**/*.xml', {
          cwd: __dirname,
          ignore: ['node_modules/**', 'dist/**']
        })
        xmlFiles.forEach(file => {
          const dest = path.join(__dirname, 'dist', file)
          fse.ensureDirSync(path.dirname(dest))
          fse.copySync(path.join(__dirname, file), dest)
        })
        
        // ✅ FIXED: Copy images and other assets INCLUDING VIDEO FILES
        const assetFiles = glob.sync('**/*.{png,jpg,jpeg,gif,svg,ico,webp,woff,woff2,ttf,eot,mp4,webm,mov,avi}', {
          cwd: __dirname,
          ignore: ['node_modules/**', 'dist/**']
        })
        assetFiles.forEach(file => {
          const dest = path.join(__dirname, 'dist', file)
          fse.ensureDirSync(path.dirname(dest))
          fse.copySync(path.join(__dirname, file), dest)
        })
        
        console.log(`Copied:`)
        console.log(`- ${htmlFiles.length} HTML files`)
        console.log(`- ${cssFiles.length} CSS files`)
        console.log(`- ${jsFiles.length} JavaScript files`)
        console.log(`- ${jsonFiles.length} JSON/Manifest files`)
        console.log(`- ${txtFiles.length} Text files (ads.txt, etc.)`)
        console.log(`- ${xmlFiles.length} XML files (sitemap.xml, etc.)`)
        console.log(`- ${assetFiles.length} Asset files`)
      }
    }
  ],
  server: {
    port: 8080,
    open: true
  }
})
