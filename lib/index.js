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

        var inputs = paths[0];
        var layouts = paths[1];

        fs.mkdir(output, transform.bind(null, inputs, toObject(layouts, getName), output));
    });
};

function toObject(arr, nameCb) {
    var ret = {};

    arr.forEach(function(v) {
        ret[nameCb(v)] = v;
    });

    return ret;
}

function transform(inputs, layouts, output) {
    var compiledLayouts = {};

    async.each(inputs, function(p, cb) {
        var inputName = getName(p);

        fs.readFile(p, {
            encoding: 'utf-8'
        }, function(err, d) {
            if(err) return cb(err);

            var parts = d.split('---\n');
            var front = yaml(parts[0]);
            var content = parts[1];

            if(!content) return cb(new Error('Missing content'));

            var layout = front.layout;

            if(!layout) return cb(new Error('Missing layout'));

            if(layout in compiledLayouts) {
                var compiledLayout = compiledLayouts[layout];

                console.log('data', compiledLayout({content: content}));

                cb();
            }
            else {
                fs.readFile(layouts[layout], {
                    encoding: 'utf-8'
                },function(err, d) {
                    if(err) return cb(err);

                    var compiledLayout = hbs(d);
                    compiledLayouts[layout] = compiledLayout;
                    data = compiledLayout({content: content});

                    fs.writeFile(path.join(output, inputName + '.html'), data, cb);
                });
            }
        });
    }, function(err) {
        if(err) return console.error(err);
    });
}

function getName(v) {
    return path.basename(v, path.extname(v));
}
