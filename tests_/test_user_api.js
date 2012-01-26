#!/usr/bin/env node

var mdns      = require('../lib/mdns')
  , mdns_test = require('../lib/mdns_test')
  , util      = require('util')
  ;

// XXX This test will break if two instances run on the same network

exports['simple browsing'] = function(t) {
  var timeout = 5000
    , port = 4321
    , service_type = mdns_test.suffixedServiceType('node-mdns', 'tcp');
    ;

  var timeoutId = setTimeout(function() {
    t.fail("test did not finish within " + (timeout / 1000) + " seconds.");
    t.done();
  }, timeout)

  var browser = mdns.createBrowser(service_type);

  function stopBrowserIfDone() {
    if (upCount > 0 &&
        downCount > 0 && 
        upCount == downCount && 
        changedCount == upCount + downCount)
    {
      browser.stop();
      clearTimeout(timeoutId);
      t.done();
    }
  }

  var changedCount = 0;
  browser.on('serviceChanged', function(service, flags) {
    //console.log("changed:", service);
    t.strictEqual(typeof service.flags, 'number',
        "'flags' must be a number");
    if (changedCount === 0) {
      t.ok(service.flags & mdns.kDNSServiceFlagsAdd,
          "'flags' must have kDNSServiceFlagsAdd set");
      t.strictEqual(typeof service.fullname, 'string',
          "'fullname' must be a string");
      t.strictEqual(typeof service.host, 'string',
          "'host' must be a string");
      t.strictEqual(typeof service.port, 'number',
          "'port' must be a number");
      t.strictEqual(service.port, port,
          "'port' must match the advertisement");

      t.ok('addresses' in service, 
          "'service' must have a address property");
      t.ok(Array.isArray(service.addresses),
          "'addresses' must be an array");
      t.ok(service.addresses.length > 0,
          "addresses must not be empty");
    }
    t.strictEqual(typeof service.interfaceIndex, 'number',
        "'interfaceIndex' must be a number");
    t.strictEqual(typeof service.name, 'string',
        "'name' must be a string");
    t.ok(service.type instanceof mdns.ServiceType,
        "'type' must be a service type object");
    t.strictEqual('' + service.type, service_type + '.',
        "type must match the target type");
    t.strictEqual(typeof service.replyDomain, 'string',
        "'replyDomain' must be a string");
    t.strictEqual(service.replyDomain, 'local.',
        "'replyDomain' must match 'local.'");

    changedCount += 1;
    stopBrowserIfDone();
  });

  var upCount = 0;
  browser.on('serviceUp', function(service) {
    //console.log("up:", service);
    t.strictEqual(typeof service.flags, 'number',
        "'flags' must be a number");
    t.strictEqual(typeof service.interfaceIndex, 'number',
        "'interfaceIndex' must be a number");
    t.strictEqual(typeof service.name, 'string',
        "'name' must be a string");
    t.ok(service.type instanceof mdns.ServiceType,
        "'type' must be ServiceType object");
    t.strictEqual('' + service.type, service_type + '.',
        "'type' must match target type");
    t.strictEqual(typeof service.replyDomain, 'string',
        "'replyDomain' must be a string");
    t.strictEqual(service.replyDomain, 'local.',
        "'replyDomain' must match 'local.'");

    t.strictEqual(typeof service.fullname, 'string',
        "'fullname' must be a string");
    t.strictEqual(typeof service.host, 'string',
        "'host' must be a string");
    t.strictEqual(typeof service.port, 'number',
        "'port' must be a number");
    t.strictEqual(service.port, port,
        "'port' must match");

    t.ok('addresses' in service,
        "'service' must have a addresses property");
    t.ok(Array.isArray(service.addresses),
        "'addresses' must be a string");
    t.ok(service.addresses.length > 0,
        "'addresses' must not be empty");

    t.ok('rawTxtRecord' in service,
        "'service' must have a rawTxtRecord property");
    t.ok(service.rawTxtRecord,
        "'rawTxtRecord' must be truthy");
    t.ok(service.txtRecord,
        "'txtRecord' must be truthy");
    var p;
    for (p in txt_record) {
      t.strictEqual('' + txt_record[p], service.txtRecord[p],
          "property " + p + " in txtRecord must match");
    }
    
    upCount += 1;
    stopBrowserIfDone();
  });

  var downCount = 0;
  browser.on('serviceDown', function(service) {
    t.strictEqual(typeof service.flags, 'number',
        "'flags' must be a number");
    t.strictEqual(typeof service.interfaceIndex, 'number',
        "'interfaceIndex' must be a number");
    t.strictEqual(typeof service.name, 'string',
        "'name' must be a string");
    t.ok(service.type instanceof mdns.ServiceType,
        "'type' must be a ServiceType object");
    t.strictEqual('' + service.type, service_type + '.',
        "'type' must match target aervice type");
    t.strictEqual(typeof service.replyDomain, 'string',
        "'replyDomain' must be a string");
    t.strictEqual(service.replyDomain, 'local.',
        "'replyDomain' must match 'local.'");

    downCount += 1;
    stopBrowserIfDone();
  });

  browser.start();

  var txt_record = {type: 'bacon', chunky: true, strips: 5, buffer: new Buffer('raw')}
    , ad = mdns.createAdvertisement(service_type, port,
        {txtRecord: txt_record}, function(err, service, flags) {
          if (err) throw err;
          setTimeout(function() { ad.stop() }, 500);
        });

  ad.start();
}


exports['create ads'] = function(t) {
  var timeout = 500 // ms
    , counter = 0
    ;

  function stopIfDone() {
    if (++counter === 4) {
      t.done();
    }
  }
  var ad1 = mdns.createAdvertisement(['mdns-test1', 'tcp'], 4321);
  ad1.start();
  setTimeout(function() { ad1.stop(); stopIfDone(); }, timeout);

  var ad2 = mdns.createAdvertisement(['mdns-test2', 'tcp'], 4322, {});
  ad2.start();
  setTimeout(function() { ad2.stop(); stopIfDone(); }, timeout);

  function checkAd(service, name, proto) {
    t.ok('flags' in service,
        "service must have a flags property");
    t.strictEqual(typeof service.flags, 'number',
        "'flags' must be a number");
    t.ok(service.type instanceof mdns.ServiceType,
        "'type' must be a ServiceType object");
    t.strictEqual(service.type.toString(), '_' + name + '._' + proto + '.',
        "'type' must be as advertised");
  }

  var ad3 = mdns.createAdvertisement(['mdns-test3', 'tcp'], 4323, {name: 'foobar'}, function(error, service) {
    if (error) t.fail(error);
    
    checkAd(service, 'mdns-test3', 'tcp');

    var ad = this;
    setTimeout(function(){ ad.stop(); stopIfDone(); }, timeout);
    //console.log(service)
  });
  ad3.start();

  var ad4 = mdns.createAdvertisement(['mdns-test4', 'udp'], 4324, {}, function(error, service) {
    if (error) t.fail(error);

    checkAd(service, 'mdns-test4', 'udp');

    var ad = this;
    setTimeout(function(){ ad.stop(); stopIfDone(); }, timeout);
  });
  ad4.start();

}

// vim: filetype=javascript