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

        async.waterfall([
            readFiles.bind(null, paths[0]),
            splitInputs,
            attachOutputs.bind(null, output),
            function(d, cb) {
                readFiles(paths[1], function(err, p) {
                    cb(null, {inputs: d, layouts: p});
                });
            },
            compileLayouts,
        ], function(err, res) {
            if(err) return console.error(err);

            fs.mkdir(output, transform.bind(null, res));
        });
    });
};

function readFiles(inputs, cb) {
    async.map(inputs, function(p, cb) {
        fs.readFile(p, {
            encoding: 'utf-8'
        }, function(err, d) {
            if(err) return cb(err);

            cb(null, {
                data: d,
                path: p
            });
        });
    }, cb);
}

function splitInputs(inputs, cb) {
    async.map(inputs, function(input, cb) {
        var parts = input.data.split('---\n');

        cb(null, {
            front: yaml(parts[0]),
            content: parts[1],
            path: input.path
        });
    }, cb);
}

function attachOutputs(output, inputs, cb) {
    async.map(inputs, function(input, cb) {
        input.output = path.join(output, getName(input.path)) + '.html';

        cb(null, input);
    }, cb);
}

function compileLayouts(data, cb) {
    var layouts = {};

    data.inputs.forEach(function(input) {
        var layout = input.front.layout;

        if(!(layout in layouts)) {
            layouts[layout] = compileLayout(data.layouts, layout);
        }
    });

    cb(null, {inputs: data.inputs, layouts: layouts});
}

function compileLayout(layouts, layoutName) {
    for(var i = 0, len = layouts.length; i < len; i++) {
        var layout = layouts[i];

        if(getName(layout.path) == layoutName) return hbs(layout.data);
    }
}

function getName(v) {
    return path.basename(v, path.extname(v));
}

function transform(d) {
    d.inputs.forEach(function(v) {
        fs.writeFile(v.output, d.layouts[v.front.layout]({
            content: v.content
        }));
    });
}
