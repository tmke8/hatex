const Handlebars = require('handlebars')
const sass = require('sass')
const yaml = require('js-yaml')
const fs = require('fs')
const helpers = require('./helpers.js')

// get command line arguments

var configFile = process.argv[2]

try {
    var config = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'))
} catch (e) {
    console.log(e)
}

// compile handlebars file
var source = fs.readFileSync(config.source, 'utf8')

Handlebars.registerHelper('math', helpers.mathHelper)
var template = Handlebars.compile(source)

var result = template(config.data)
console.log(result)

console.log('-----------------')
// compile SCSS file
var sassResult = sass.renderSync({file: config.css})
console.log(sassResult.css.toString())
