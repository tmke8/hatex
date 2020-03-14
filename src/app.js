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

// load config file
try {
    var config = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'))
} catch (e) {
    console.log(e)
}

// load bibliography file
var bibliography
if (config.bibliography) {
    try {
        bibliography = yaml.safeLoad(fs.readFileSync(config.bibliography, 'utf8'))
    } catch (e) {
        console.log(e)
    }
}

// register helpers
Handlebars.registerHelper('math', helpers.mathHelper)
Handlebars.registerHelper('section', helpers.sectionHelper)
Handlebars.registerHelper('subsection', helpers.subSectionHelper)
Handlebars.registerHelper('makeTitle', function() {
    return new Handlebars.SafeString(`<h1 class="title">${config.title}</h1><p class="author">${config.author}</p>`)
})
var citeCounter = 0
Handlebars.registerHelper('cite', function(bibKey) {
    let citeNumber
    if (bibliography[bibKey].citeNumber) {
        citeNumber = bibliography[bibKey].citeNumber
    } else {
        citeCounter++
        bibliography[bibKey].citeNumber = citeCounter
        citeNumber = citeCounter
    }
    return new Handlebars.SafeString(`<a href="#citation-${citeNumber}" class="citation">[${citeNumber}]</a>`)
})
Handlebars.registerHelper('bibliography', function() {
    let entries = {}
    for (let bibKey in bibliography) {
        entry = bibliography[bibKey]
        if (entry.citeNumber) {
            entries[entry.citeNumber] = entry
        }
    }
    let buffer = ['<h1>Bibliography</h1><ol class="bibliography">']
    for (let citeNumber of Object.keys(entries).sort()) {
        entry = entries[citeNumber]
        buffer.push(`\t<li id="citation-${citeNumber}">${entry.author}, &ldquo;${entry.title}&rdquo;, ${entry.booktitle}, ${entry.year}.`)
    }
    buffer.push('</ol>')
    return new Handlebars.SafeString(buffer.join('\n'))
})

// compile handlebars file and register it as a partial (it will be included in the base template)
let source = fs.readFileSync(config.source, 'utf8')
let compiledSource = Handlebars.compile(source)
Handlebars.registerPartial('content', compiledSource)

// compile SCSS file and register it as a partial
let sassResult = sass.renderSync({file: config.scss})
Handlebars.registerPartial('css', sassResult.css.toString())

// load BASE template file from where this script is (__dirname) and compile it
let base_template_source = fs.readFileSync(path.resolve(__dirname, 'template.hbs'), 'utf8')
let base_template = Handlebars.compile(base_template_source)

// apply base template
let output = base_template(Object.assign({'title_': config.title, 'language_': config.language}, config.data))

// write output
parsedFilename = path.parse(config.source)
let outputFile = path.join(parsedFilename.dir, parsedFilename.name + '.html')
fs.writeFileSync(outputFile, output)

console.log(`Success! Written to ${outputFile}`)
