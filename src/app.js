const Handlebars = require('handlebars')
const sass = require('sass')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
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
Handlebars.registerHelper('makeTitle', function() {
    return new Handlebars.SafeString(`<h1 class="title">${config.title}</h1><p class="author">${config.author}</p>`)
})
var compiledSource = Handlebars.compile(source)

// var content = compiledSource(config.data)
// console.log(content)

// console.log('-----------------')
// compile SCSS file
var sassResult = sass.renderSync({file: config.css})
// console.log(sassResult.css.toString())

var template_source = fs.readFileSync('template.hbs', 'utf8')

var template = Handlebars.compile(template_source)
Handlebars.registerPartial('content', compiledSource)
Handlebars.registerPartial('css', sassResult.css.toString())

var output = template(Object.assign({'title_': config.title, 'language_': config.language}, config.data))
parsedFilename = path.parse(config.source)
fs.writeFileSync(path.join(parsedFilename.dir, parsedFilename.name + '.html'), output)
