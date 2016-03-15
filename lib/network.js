'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const util = require('util');
const url = require('url');
const async = require('async');
const debug_ = require('debug');
const request = require('request');
const yaml = require('js-yaml');
const _ = require('lodash');
const agent_config_validator = require('./agent-validator');
const config_validator = require('./validator');
const debug = debug_('agent:config');
const ioLib = require('./io');

var retry;
const Loader = function (io) {
  this.io = io || ioLib();
};

module.exports = function () {
  return new Loader();
};

/**
 * load the config from the network and merge with default config
 * @param options {target:save location and filename,keys: {key:,secret:},source:default loading target}
 * @param callback function(err){}
 */
Loader.prototype.get = function (options, callback) {
  assert(options, 'options cannot be null');
  assert(options.keys, 'options.keys cannot be null');

  var target = options.target;
  const keys = options.keys;
  const source = options.source;
  const io = this.io;

  this.config = this.io.loadSync({source: source});

  const err = _validateUrls(this.config);
  if(err){
    return callback(err);
  }

  const config = _setDefaults(this.config);

  target = target || _setTarget(config);

  // initiate an immediate load, and setup retries if it fails
  _load(config, keys, function (err, proxies, products) {
    if (proxies && products ) {
      _mergeAndReturnConfig(config, keys, proxies, products, {io: io, target: target}, callback);
    } else {
      // check if we have a retry_interval specified
      // any value less than 5 seconds is assumed invalid and ignored
      // start with the cached copy while we retry updates in the background
      const mergedConfig = io.loadSync({source:source});
      if (mergedConfig) {
        console.info('loaded cached config from', target);
        _mergeKeys(mergedConfig, keys); // merge keys before sending to edge micro
        callback(null, mergedConfig);
      } else {
        console.error('fatal:',
          'cached config not available, unable to continue');
        callback(new Error('cached config not available, unable to continue'))
      }
    }
  });
}


const _load = function (config, keys, callback) {
  const options = {};
  if (config.edge_config.proxy) {
    options['proxy'] = config.edge_config.proxy;
  }
  if (typeof config.edge_config.proxy_tunnel !== 'undefined') {
    options['tunnel'] = config.edge_config.proxy_tunnel;
  }
  async.parallel([
    function (cb) {
      const opts = _.clone(options);
      opts['url'] = config.edge_config.bootstrap;
      opts['auth'] = {
        user: keys.key,
        pass: keys.secret,
        sendImmediately: true
      };
      request.get(opts, function (err, response, body) {
        _loadStatus('config', config.edge_config.bootstrap, err, response, body, cb);
      });
    },
    function (cb) {
      const opts = _.clone(options);
      opts['url'] = config.edge_config.products;
      request.get(opts, function (err, response, body) {
        _loadStatus('products', config.edge_config.products, err, response, body, cb);
      });
    },
    function (cb) {
      const opts = _.clone(options);
      opts['url'] = config.edge_config.jwt_public_key;
      request.get(opts, function (err, response, body) {
        _loadStatus('jwt_public_key', config.edge_config.jwt_public_key,
          err, response, body, cb);
      });
    }
  ], function (err, results) {
    debug('error %s, proxies %s, products %s, jwt_public_key %s', err,
      results[0], results[1], results[2]);
    if (err) {
      console.error('warning:',
        'error downloading config, please check bootstrap configuration',
        err);
    }
    var proxyInfo;
    try {
      proxyInfo = results[0] ? JSON.parse(results[0]) : {apiProxies: []};
    } catch (err) {
      console.error('warning:', 'error parsing downloaded proxy list',
        err);
    }
    var proxies = proxyInfo && proxyInfo.apiProxies ? proxyInfo.apiProxies : [];
    if (!proxies) {
      console.error('warning:',
        'no edge micro proxies found in response');
      proxies = [];
    }
    if (proxies.length === 0) {
      console.error('warning:', 'no edge micro proxies found in org');
    } else {
      console.info('downloaded proxies', util.inspect(proxies, {
        colors: true
      }));
    }
    var productInfo;
    try {
      productInfo = results[1] ? JSON.parse(results[1]) : {apiProduct: []};
    } catch (err) {
      console.error('warning:', 'error parsing downloaded product list',
        err);
    }
    if (!productInfo) {
      console.error('warning:',
        'no edge micro products found in response');
    }
    var products = productInfo && productInfo.apiProduct ? productInfo.apiProduct : [];
    if (!products) {
      console.error('warning:', 'no products found in response');
      products = [];
    }
    if (products.length === 0) {
      console.error('warning:', 'no products found in org');
    } else {
      console.info('downloaded products', util.inspect(products, {
        colors: true
      }));
    }
    if (!config.oauth)
      config.oauth = {};
    if (results.length > 1 && results[2]) {
      config.oauth.public_key = results[2]; // save key in oauth section
      console.info('downloaded jwt_public_key', util.inspect(config.oauth
        .public_key, {
        colors: true
      }));
    } else {
      console.error('warning:', 'failed to download jwt_public_key');
    }

    callback(null, proxies, products);
  });
};


/**
 * read response status
 * @param message
 * @param url
 * @param err
 * @param response
 * @param body
 * @param cb
 * @private
 */
const _loadStatus = function (message, url, err, response, body, cb) {
  const failed = err || (response && response.statusCode !== 200);
  console.info(failed ? 'warning:' : 'info:', message, 'download from', url,
    'returned', response ? (response.statusCode + ' ' + response.statusMessage) :
      '', err ? err : '');
  if (err) {
    cb(err, body);
  } else if (response && response.statusCode !== 200) {
    cb(new Error(response.statusMessage), body);
  } else {
    cb(err, body);
  }
}

/**
 * merge downloaded config with keys
 * @param mergedConfig
 * @param keys
 * @private
 */
function _mergeKeys(mergedConfig, keys) {
  assert(keys.key, 'key is missing');
  assert(keys.secret, 'secret is missing');
  // copy keys to analytics section
  if (!mergedConfig.analytics)
    mergedConfig.analytics = {};
  mergedConfig.analytics.key = keys.key;
  mergedConfig.analytics.secret = keys.secret;
  // copy keys to quota section
  if (mergedConfig.quota) {
    Object.keys(mergedConfig.quota).forEach(function (name) {
      const quota = mergedConfig.quota[name];
      quota.key = keys.key;
      quota.secret = keys.secret;
    });
  }
}

/**
 *
 * @param config
 * @param proxies
 * @param products
 * @returns {{}}
 * @private
 */
const _merge = function (config, proxies, products) {
  const updates = _.clone(config);
  // copy properties to edge micro section
  if (!updates.edgemicro)
    updates.edgemicro = {};
  updates.edgemicro.port = config.edgemicro.port;
  // copy properties to oauth section
  if (!updates.oauth)
    updates.oauth = {};
  updates.oauth.path_to_proxy = products.path_to_proxy;
  updates.oauth.product_to_proxy = products.product_to_proxy;
  const mergedConfig = {};
  Object.keys(updates).forEach(function (key) {
    if (key !== 'agent' && key !== 'edge_config') {
      mergedConfig[key] = updates[key];
    }
  });
  mergedConfig['proxies'] = proxies;
  mergedConfig['path_to_proxy'] = products.path_to_proxy;
  mergedConfig['product_to_proxy'] = products.product_to_proxy;
  mergedConfig['quota'] = products.product_to_quota;
  if (mergedConfig['quota']) {
    const uri = updates.edge_config.bootstrap.replace('bootstrap', 'quotas');
    Object.keys(mergedConfig['quota']).forEach(function (name) {
      mergedConfig['quota'][name].uri = uri;
    });
  }
  return mergedConfig;
};

const _mergeAndReturnConfig = function (config, keys, proxies, products, options, cb) {
  assert(options.io);
  assert(options.target);
  const mergedConfig = _merge(config, _mapEdgeProxies(proxies), _mapEdgeProducts(products));
  _saveAndReturnConfig(mergedConfig, keys, options, cb);
};

const _saveAndReturnConfig = function (mergedConfig, keys, options, cb) {
  assert(options.target);
  assert(options.io);
  config_validator.validate(mergedConfig);
  const f = function () {
    _mergeKeys(mergedConfig, keys); // merge keys before sending to edge micro
    cb(null, mergedConfig);
  };
    options.io.save(mergedConfig, {target: options.target}, function (err) {
      err && console.error(err);
      f();
    });
};


const _mapEdgeProxies = function (proxies) {
  const mappedProxies = [];
  assert(Array.isArray(proxies), 'proxies should be an array');
  proxies.forEach(function (target) {
    const tgt = {};
    tgt['max_connections'] = target['maxConnections'] || -1;
    Object.keys(target).forEach(function (key) {
      switch (key) {
        case 'apiProxyName':
          tgt['name'] = target[key];
          break;
        case 'proxyEndpoint':
          const proxyEndpoint = target[key];
          if (proxyEndpoint) {
            tgt['proxy_name'] = proxyEndpoint['name'];
            tgt['base_path'] = proxyEndpoint['basePath'];
          }
          break;
        case 'targetEndpoint':
          const targetEndpoint = target[key];
          if (targetEndpoint) {
            tgt['target_name'] = targetEndpoint['name'];
            tgt['url'] = targetEndpoint['url'];
          }
          break;
        default:
          // copy over unknown properties
          tgt[key] = target[key];
      }
    });
    if (_validateTarget(tgt)) {
      mappedProxies.push(tgt);
    }
  });
  return mappedProxies;
}
// note: path_to_proxy as written below is broken, one product path can have multiple proxies
const _mapEdgeProducts = function (products) {
  //const path_to_proxy = {};
  const product_to_quota = {};
  const product_to_proxy = {};
  assert(Array.isArray(products), 'products should be an array');
  products.forEach(function (product) {
    assert(Array.isArray(product.proxies), 'proxies for product ' +
      product + ' should be an array');
    product.proxies.forEach(function (proxy) {
      if (product_to_proxy[product.name]) {
        product_to_proxy[product.name].push(proxy);
      } else {
        product_to_proxy[product.name] = [proxy];
      }
      if (product.quota) {
        product_to_quota[product.name] = {
          allow: product.quota,
          interval: product.quotaInterval,
          timeUnit: product.quotaTimeUnit,
          bufferSize: 10000
        };
      }
    });
  });
  return {
    //path_to_proxy: path_to_proxy,
    product_to_proxy: product_to_proxy,
    product_to_quota: product_to_quota
  };
}

const _validateTarget = function (target) {
  if (target.base_path && target.base_path.length > 0 &&
    target.url && target.url.length > 0) {
    return true;
  } else {
    debug('dropping invalid target %o', target);
    return false;
  }
}


function _setDefaults(config) {
  agent_config_validator.validate(config);

// derive products and oauth uris from jwt_public_key config
  config.edge_config.products = config.edge_config.jwt_public_key.replace('publicKey', 'products');
  config.oauth.verify_api_key_url = config.edge_config.jwt_public_key.replace('publicKey', 'verifyApiKey');
  // derive analytics uri from bootstrap config
  if (!config.analytics) {
    config.analytics = {};
  }
  config.analytics.uri = config.edge_config.bootstrap.replace('bootstrap', 'axpublisher');
  config.analytics.source = 'microgateway'; // marker
  config.analytics.proxy = 'dummy'; // placeholder
  config.analytics.proxy_revision = 1; // placeholder
  config.analytics.compress = false; // turn off analytics payload compression
  // the default value of 5s allows a max of 100 records/s with a batch size of 500
  // an interval of 250 ms allows 4 batches of 500, for a max throughput of 2k/s
  config.analytics.flushInterval = 250;
  // propagate proxy configuration to the edgemicro section for use by edgemicro
  if (config.edge_config.proxy) {
    config.edgemicro.proxy = config.edge_config.proxy;
    config.edgemicro.proxy_tunnel = config.edge_config.proxy_tunnel;
  }
  return config;
}

function _setTarget(config) {
// extract org and env from the bootstrap config uri
  const org = /organization\/(.+)\/environment/.exec(config.edge_config.bootstrap)[
    1];
  const env = /environment\/(.+)$/.exec(config.edge_config.bootstrap)[1];
  assert(org, 'unable to determine org from edge config bootstrap uri');
  assert(env, 'unable to determine env from edge config bootstrap uri');

  const save_file = util.format('edgemicro-config-%s-%s.yaml', org, env);
  return path.join(config.edgemicro.logging.dir, save_file);
}

const _validateUrls = function (config) {
  const bootstrapUrl = url.parse(config.edge_config.bootstrap);
  const publicKeyUrl = url.parse(config.edge_config.jwt_public_key);
  if (bootstrapUrl.hostname === 'apigee.net'
    || bootstrapUrl.pathname.indexOf('...') > 0
    || publicKeyUrl.hostname === 'apigee.net'
    || publicKeyUrl.pathname.indexOf('...') > 0) {
    console.error('it looks like edge micro has not been configured, please see the admin guide');
    return new Error('it looks like edge micro has not been configured, please see the admin guide');
  }
  return null
};