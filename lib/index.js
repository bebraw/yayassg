var fs = require('fs');
var path = require('path');

var async = require('async');
var glob = require('glob');
var hbs = require('handlebars').compile;
var yaml = require('yaml').eval;


module.exports = function(input, output) {
    async.map([
        path.join(input, '**/*.md'),
        path.join(input, '_layouts', '*.hbs')
    ], glob, function(err, paths) {
        if(err) return console.error(err);

        main(paths[0], paths[1], output);
   });
};

function main(inputs, layouts, output) {
    async.parallel([
        readAndProcess.bind(null, inputs, saltInputs.bind(null, output)),
        readAndProcess.bind(null, layouts, compileLayouts)
    ], function(err, res) {
        if(err) return console.error(err);

        fs.mkdir(output, transform.bind(null, res[0], res[1]));
    });
}

function readAndProcess(input, process, cb) {
    async.waterfall([readFiles.bind(null, input), process], cb);
}

function readFiles(inputs, cb) {
    async.map(inputs, function(p, cb) {
        fs.readFile(p, function(err, d) {
            if(err) return cb(err);

            cb(null, {
                data: d.toString(),
                path: p
            });
        });
    }, cb);
}

function saltInputs(output, inputs, cb) {
    async.map(inputs, function(input, cb) {
        var parts = input.data.split('---\n');

        cb(null, {
            front: yaml(parts[0]),
            content: parts[1],
            output: path.join(output, getName(input.path)) + '.html'
        });
    }, cb);
}

function compileLayouts(layouts, cb) {
    var ret = {};

    layouts.forEach(function(layout) {
        ret[getName(layout.path)] = hbs(layout.data);
    });

    cb(null, ret);
}

function getName(v) {
    return path.basename(v, path.extname(v));
}

function transform(inputs, layouts) {
    inputs.forEach(function(v) {
        fs.writeFile(v.output, layouts[v.front.layout]({
            content: v.content
        }));
    });
}
