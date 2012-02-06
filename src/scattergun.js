var fs = require("fs"),
    sys = require("sys"),
    child_process = require('child_process'),
    toGrep = process.argv.slice(3).concat(['js']).map(function (e) { 
      return "\\." + e + "$";
    }).join("|");

if (process.argv.length < 3) {
  sys.puts("Usage: node scattergun.js my_app.js");
  sys.puts('   or: node scattergun.js my_app.js html coffee etc');
  process.exit(1);
}

var watchedFiles = [];
var watch = function(callback) {
  watchedFiles.forEach(fs.unwatchFile);  
  child_process.exec('find . | egrep "' + toGrep + '"', function (err, out) {
    watchedFiles = out.trim().split("\n");
    watchedFiles.forEach(function (file) {
      sys.debug("           watching " + file);
      fs.watchFile(file, {interval : 500}, function (curr, prev) {
        if (curr.mtime.valueOf() !== prev.mtime.valueOf() || 
            curr.ctime.valueOf() !== prev.ctime.valueOf()) {
            callback(file);
        }
      });
    });
  });
};

var startChild = function () {
  var child = child_process.spawn("node", [process.argv[2]]);
  child.stdout.addListener('data', function (data) {
    process.stdout.write(data);
  });
  child.stderr.addListener('data', function (data) {
    sys.print(data);
  });
  child.addListener('exit', function (code) {
    if (code == 0) {
      process.exit(0);
    } else if (code == 1) {
      sys.debug('Scattergun waiting for the error to be fixed');
      watch(function (file) {
        sys.debug('Scattergun detected change in file ' + file);
        startChild();
      });
    } else {
      startChild();
    }
  });
  watch(function (file) {
    sys.debug('Scattergun detected change in file ' + file);
    child.kill();
  });
  sys.debug('Scattergun starting ' + process.argv[2]);
};

startChild();
