const katex = require('katex')
const Handlebars = require('handlebars')

exports.mathHelper = function(mathCode) {
    return new Handlebars.SafeString(katex.renderToString(mathCode), {
        throwOnError: false
    })
}
