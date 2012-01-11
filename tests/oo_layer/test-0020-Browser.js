#!/usr/bin/env node

var mdns   = require('../../lib/mdns')
  , assert = require('assert')
  , util   = require('util')
  ;

// XXX This test will break if two instances are run on the same network

var timeout = 5000;
var timeoutId = setTimeout(function() {
  assert.fail("test did not finish within " + (timeout / 1000) + " seconds.");
}, timeout)

var browser = mdns.createBrowser(mdns.tcp('node-mdns-test'));

function stopBrowserIfDone() {
  if (upCount > 0 &&
      downCount > 0 && 
      upCount == downCount && 
      changedCount == upCount + downCount)
  {
    browser.stop();
    clearTimeout(timeoutId);
  }
}

var changedCount = 0;
browser.on('serviceChanged', function(info, flags) {
  //console.log("changed:", info);
  assert.strictEqual(typeof info.flags, 'number');
  if (changedCount === 0) {
    assert.ok(info.flags & mdns.kDNSServiceFlagsAdd);
    assert.strictEqual(typeof info.fullname, 'string');
    assert.strictEqual(typeof info.host, 'string');
    assert.strictEqual(typeof info.port, 'number');
    assert.strictEqual(info.port, 4321);

    assert.ok('addresses' in info);
    assert.ok(Array.isArray(info.addresses));
    assert.ok(info.addresses.length > 0);
  }
  assert.strictEqual(typeof info.interfaceIndex, 'number');
  assert.strictEqual(typeof info.serviceName, 'string');
  assert.ok(info.regtype instanceof mdns.RegType);
  assert.strictEqual('' + info.regtype, '_node-mdns-test._tcp.');
  assert.strictEqual(typeof info.replyDomain, 'string');
  assert.strictEqual(info.replyDomain, 'local.');

  changedCount += 1;
  stopBrowserIfDone();
});

var upCount = 0;
browser.on('serviceUp', function(info) {
  console.log("up:", info);
  assert.strictEqual(typeof info.flags, 'number');
  assert.strictEqual(typeof info.interfaceIndex, 'number');
  assert.strictEqual(typeof info.serviceName, 'string');
  assert.ok(info.regtype instanceof mdns.RegType);
  assert.strictEqual('' + info.regtype, '_node-mdns-test._tcp.');
  assert.strictEqual(typeof info.replyDomain, 'string');
  assert.strictEqual(info.replyDomain, 'local.');

  assert.strictEqual(typeof info.fullname, 'string');
  assert.strictEqual(typeof info.host, 'string');
  assert.strictEqual(typeof info.port, 'number');
  assert.strictEqual(info.port, 4321);

  assert.ok('addresses' in info);
  assert.ok(Array.isArray(info.addresses));
  assert.ok(info.addresses.length > 0);

  upCount += 1;
  stopBrowserIfDone();
});

var downCount = 0;
browser.on('serviceDown', function(info) {
  assert.strictEqual(typeof info.flags, 'number');
  assert.strictEqual(typeof info.interfaceIndex, 'number');
  assert.strictEqual(typeof info.serviceName, 'string');
  assert.ok(info.regtype instanceof mdns.RegType);
  assert.strictEqual('' + info.regtype, '_node-mdns-test._tcp.');
  assert.strictEqual(typeof info.replyDomain, 'string');
  assert.strictEqual(info.replyDomain, 'local.');

  downCount += 1;
  stopBrowserIfDone();
});

browser.start();

process.on('exit', function() {
  assert.ok(changedCount >= 2);
  assert.ok(upCount >= 1);
  assert.ok(downCount >= 1);
});

var ad = mdns.createAdvertisement(mdns.tcp('node-mdns-test'), 4321, function(err, info, flags) {
    if (err) throw err;
    setTimeout(function() { ad.stop() }, 500);
});

ad.start();


//=== Regression Tests ========================================================

// autoResolve can not be set to a falsy value.
// Reported by orlandv and others (issue #9)

// FIX: replaced nested-flag-madness with something more scalable.
//var regression_browser = mdns.createBrowser(mdns.tcp('node-mdns-t2'),
//    {autoResolve: false});
//assert.ok(regression_browser.autoresolve === false);



// vim: filetype=javascript
