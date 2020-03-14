const katex = require('katex')
const Handlebars = require('handlebars')

exports.mathHelper = function(mathCode) {
    return new Handlebars.SafeString(katex.renderToString(mathCode), {
        throwOnError: false
    })
}

var sectionCounter = 0
var subSectionCounter = 0

exports.sectionHelper = function(sectionTitle) {
    sectionCounter++
    subSectionCounter = 0  // reset subsection counter
    return new Handlebars.SafeString(`<h1>${sectionCounter}&nbsp;${sectionTitle}</h1>`)
}

exports.subSectionHelper = function(subSectionTitle) {
    subSectionCounter++
    return new Handlebars.SafeString(`<h2>${sectionCounter}.${subSectionCounter}&nbsp;${subSectionTitle}</h2>`)
}
