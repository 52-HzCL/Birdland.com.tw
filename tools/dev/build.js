'use strict';
require('../build/site').buildSite();
require('./gen-terminal');
require('child_process').execFileSync(process.execPath, [require('path').join(__dirname,'build-configurator.js'),'--all'], {stdio:'inherit'});
