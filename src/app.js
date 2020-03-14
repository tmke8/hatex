#!/usr/bin/env node
const Handlebars = require('handlebars')
const sass = require('sass')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const helpers = require('./helpers.js')
const program = require('commander')

// get command line arguments
var configFile
program
    .version('0.1.0')
    .usage('<file>')
    .arguments('<file>')
    .action(function(file) {
        configFile = file;
    })
    .parse(process.argv)

if (configFile === undefined) {
    console.error('no file given!')
    process.exit(1)
}

try {
    var config = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'))
} catch (e) {
    console.log(e)
}

// register helpers
Handlebars.registerHelper('math', helpers.mathHelper)
Handlebars.registerHelper('section', helpers.sectionHelper)
Handlebars.registerHelper('subsection', helpers.subSectionHelper)
Handlebars.registerHelper('makeTitle', function() {
    return new Handlebars.SafeString(`<h1 class="title">${config.title}</h1><p class="author">${config.author}</p>`)
})

// compile handlebars file and register it as a partial (it will be included in the base template)
var source = fs.readFileSync(config.source, 'utf8')
var compiledSource = Handlebars.compile(source)
Handlebars.registerPartial('content', compiledSource)

// compile SCSS file and register it as a partial
var sassResult = sass.renderSync({file: config.scss})
Handlebars.registerPartial('css', sassResult.css.toString())

// load BASE template file from where this script is (__dirname) and compile it
var base_template_source = fs.readFileSync(path.resolve(__dirname, 'template.hbs'), 'utf8')
var base_template = Handlebars.compile(base_template_source)

// apply base template
var output = base_template(Object.assign({'title_': config.title, 'language_': config.language}, config.data))

// write output
parsedFilename = path.parse(config.source)
var outputFile = path.join(parsedFilename.dir, parsedFilename.name + '.html')
fs.writeFileSync(outputFile, output)

console.log(`Success! Written to ${outputFile}`)
