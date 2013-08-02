var path = require('path');

var async = require('async');
var glob = require('glob');


module.exports = function(input, output) {
    async.map([
        path.join(input, '**/*.md'),
        path.join(input, '_layouts', '*.hbs')
    ], glob, function(err, paths) {
        if(err) return console.error(err);

        var inputs = paths[0];
        var layouts = paths[1];

        console.log(inputs, layouts);
    })
};
