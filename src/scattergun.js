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

(function () {
  var files = [], restarting = false, me = arguments.callee, processSelf;
  sys.debug('Scattergun starting ' + process.argv[2]);
  processSelf = child_process.spawn("node", [process.argv[2]]);
  processSelf.stdout.addListener('data', function (data) {
    process.stdout.write(data);
  });
  processSelf.stderr.addListener('data', function (data) {
    sys.print(data);
  });
  processSelf.addListener('exit', function (code) {
    if (!restarting) {
      process.exit(0);
    }
    files.forEach(fs.unwatchFile);
    me();
    restarting = false;
  });
  child_process.exec('find . | egrep "' + toGrep + '"', function (err, out) {
    files = out.trim().split("\n");
    files.forEach(function (file) {
      sys.debug("           watching " + file);
      fs.watchFile(file, {interval : 500}, function (curr, prev) {
        if (curr.mtime.valueOf() !== prev.mtime.valueOf() || 
            curr.ctime.valueOf() !== prev.ctime.valueOf()) {
          sys.debug('Scattergun detected changed file at ' + file);
          restarting = true;
          processSelf.kill();
        }
      });
    });
  });	
}());
