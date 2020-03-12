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
var sassResult = sass.renderSync({file: config.scss})
// console.log(sassResult.css.toString())

// load template file from where this script is (__dirname)
var template_source = fs.readFileSync(path.resolve(__dirname, 'template.hbs'), 'utf8')

var template = Handlebars.compile(template_source)
Handlebars.registerPartial('content', compiledSource)
Handlebars.registerPartial('css', sassResult.css.toString())

var output = template(Object.assign({'title_': config.title, 'language_': config.language}, config.data))
parsedFilename = path.parse(config.source)
var outputFile = path.join(parsedFilename.dir, parsedFilename.name + '.html')
fs.writeFileSync(outputFile, output)

console.log(`Success! Written to ${outputFile}`)
