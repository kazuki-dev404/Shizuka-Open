const fs = require("fs")
const path = require("path")
const chalk = require("chalk")

const pluginFolder = path.join(__dirname, "../plugins")

function getAllPlugins(dir) {
  let results = []
  const list = fs.readdirSync(dir)

  for (let file of list) {
    const fullPath = path.join(dir, file)

    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
      results = results.concat(getAllPlugins(fullPath))
    } else if (file.endsWith(".js") || file.endsWith(".cjs")) {
      results.push(fullPath)
    }
  }

  return results
}

function loadPlugins() {
  let plugins = {}
  const files = getAllPlugins(pluginFolder)

  for (let filePath of files) {
    try {
      if (!fs.existsSync(filePath)) continue

      delete require.cache[require.resolve(filePath)]

      const pluginName = path.relative(pluginFolder, filePath)

      plugins[pluginName] = require(filePath)

      console.log(chalk.greenBright("plugin loaded ♡:"), pluginName)
    } catch (e) {
      console.log(chalk.redBright("plugin oopsie:"), filePath)
      console.log(e)
    }
  }

  return plugins
}

let debounce = {}

function watchPlugins(dir) {
  fs.watch(dir, (eventType, filename) => {
    if (!filename) return

    if (!filename.endsWith(".js") && !filename.endsWith(".cjs")) return

    const fullPath = path.join(dir, filename)
    const pluginName = path.relative(pluginFolder, fullPath)

    if (debounce[fullPath]) clearTimeout(debounce[fullPath])

    debounce[fullPath] = setTimeout(() => {
      if (!fs.existsSync(fullPath)) {
        console.log(chalk.redBright(`plugin deleted: ${pluginName}`))

        try {
          delete require.cache[require.resolve(fullPath)]
        } catch {}

        delete global.plugins[pluginName]
        return
      }

      console.log(chalk.yellowBright(`plugin updated: ${pluginName}`))

      try {
        delete require.cache[require.resolve(fullPath)]

        global.plugins[pluginName] = require(fullPath)

        console.log(chalk.greenBright(`plugin reloaded ♡: ${pluginName}`))
      } catch (err) {
        console.log(chalk.redBright(`reload oopsie: ${pluginName}`))
        console.log(err)
      }
    }, 200)
  })

  fs.readdirSync(dir).forEach((file) => {
    const full = path.join(dir, file)

    if (fs.existsSync(full) && fs.lstatSync(full).isDirectory()) {
      watchPlugins(full)
    }
  })
}

module.exports = { loadPlugins, watchPlugins }