'use strict';

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const defaultValidator = require('../lib/default-validator.js');
const { init, load, get, save } = require('../index.js');
const fixtureDirectory = path.join(__dirname, 'fixtures');
const defaultOrgEnvFilename = `load-victorshaw-eval-test-config.yaml`;
const customFixtureDirPath = path.join(fixtureDirectory, defaultOrgEnvFilename);
// let cachedConfigFixturePath = path.join(fixtureDirectory, 'cached.yaml');
const loadedConfig = load({ source: customFixtureDirPath });
const _ = require('lodash');


describe('default-validator module', () => {

    it('validates config', (done) => {
        try {
            defaultValidator.validate(loadedConfig);
        } catch (err) {
            assert.equal(err, null);
        }
        done();
    });

    it('throws error for invalid quota timeunit', (done) => {
        const invalidQuotaConfig = Object.assign({}, loadedConfig, { quota: { timeUnit: 'millenia' } })
        try {
            defaultValidator.validate(invalidQuotaConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('invalid value for config.quota.timeUnit'));
        }
        done();
    });

    it('throws error for undefined quota interval', (done) => {
        const invalidQuotaConfig = Object.assign({}, loadedConfig, { quota: { timeUnit: 'week' } })
        try {
            defaultValidator.validate(invalidQuotaConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('config.quota.interval is not defined'));
        }
        done();
    });

    it('throws error for non number quota interval', (done) => {
        const invalidQuotaConfig = Object.assign({}, loadedConfig, { quota: { timeUnit: 'week' , interval: true} })
        try {
            defaultValidator.validate(invalidQuotaConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('config.quota.interval is not a number'));
        }
        done();
    });

    it('throws error for non positive quota interval', (done) => {
        const invalidQuotaConfig = Object.assign({}, loadedConfig, { quota: { timeUnit: 'week' , interval: -1} })
        try {
            defaultValidator.validate(invalidQuotaConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('invalid value for config.quota.interval'));
        }
        done();
    });

    it('throws error for undefined quota allow', (done) => {
        const invalidQuotaConfig = Object.assign({}, loadedConfig, { quota: { timeUnit: 'week' , interval: 1} })
        try {
            defaultValidator.validate(invalidQuotaConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('config.quota.allow is not defined'));
        }
        done();
    });

    it('throws error for non number quota allow', (done) => {
        const invalidQuotaConfig = Object.assign({}, loadedConfig, { quota: { timeUnit: 'week' , interval: 1, allow: true} })
        try {
            defaultValidator.validate(invalidQuotaConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('config.quota.allow is not a number'));
        }
        done();
    });

    it('throws error for non positive quota allow', (done) => {
        const invalidQuotaConfig = Object.assign({}, loadedConfig, { quota: { timeUnit: 'week' , interval: 1, allow: -1} })
        try {
            defaultValidator.validate(invalidQuotaConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('invalid value for config.quota.allow'));
        }
        done();
    });

    it('throws error for invalid spikearrest buffersize', (done) => {
        const invalidSpikeArrest = Object.assign({}, loadedConfig, { spikearrest: { timeUnit: 'minute', bufferSize: 'over9000' } })
        try {
            defaultValidator.validate(invalidSpikeArrest);
        } catch (err) {
            assert(err.message.includes('config.spikearrest.bufferSize is not a number'));
        }
        done();
    });

    it('throws error for non positive spikearrest buffersize', (done) => {
        const invalidSpikeArrest = Object.assign({}, loadedConfig, { spikearrest: { timeUnit: 'minute', bufferSize: -1 } })
        try {
            defaultValidator.validate(invalidSpikeArrest);
        } catch (err) {
            assert(err.message.includes('config.spikearrest.bufferSize is invalid'));
        }
        done();
    });

    it('throws error for undefined spikearrest allow', (done) => {
        const invalidSpikeArrest = Object.assign({}, loadedConfig, { spikearrest: { timeUnit: 'minute', bufferSize: 1 } })
        try {
            defaultValidator.validate(invalidSpikeArrest);
        } catch (err) {
            assert(err.message.includes('config.spikearrest.allow is not defined'));
        }
        done();
    });

    it('throws error for non number spikearrest allow', (done) => {
        const invalidSpikeArrest = Object.assign({}, loadedConfig, { spikearrest: { timeUnit: 'minute', bufferSize: 1, allow: 'overx' } })
        try {
            defaultValidator.validate(invalidSpikeArrest);
        } catch (err) {
            assert(err.message.includes('config.spikearrest.allow is not a number'));
        }
        done();
    });

    it('throws error for non positive spikearrest allow', (done) => {
        const invalidSpikeArrest = Object.assign({}, loadedConfig, { spikearrest: { timeUnit: 'minute', bufferSize: 1, allow: -1 } })
        try {
            defaultValidator.validate(invalidSpikeArrest);
        } catch (err) {
            assert(err.message.includes('config.spikearrest.allow is invalid'));
        }
        done();
    });

    it('throws error for invalid port', (done) => {
        const invalidPortConfig = Object.assign({}, loadedConfig, { edgemicro: { port: 'over9000' } })
        try {
            defaultValidator.validate(invalidPortConfig);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('invalid value for config.edgemicro.port'));
        }
        done();
    });

    it('throws error for invalid refresh interval', (done) => {
        const edgeconfigRefreshInterval = Object.assign({}, loadedConfig.edge_config, { retry_interval: 9001, refresh_interval: 9001 })
        const invalidRefreshInterval = Object.assign({}, loadedConfig, { edge_config: edgeconfigRefreshInterval })
        try {
            defaultValidator.validate(invalidRefreshInterval);
        } catch (err) {
            assert(err instanceof Error);
            assert(err.message.includes('config.edge_config.refresh_interval is too small (min 1h)'));
            done();
        }
    });

    it('throws error for invalid quotas type', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: 2})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
            flag = err.message.includes('config.quotas is not an object');
        }
        assert(flag);
        done();
    });

    it('throws error for invalid quotas key', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { invalid: {}}})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
            flag = err.message.includes('invalid value in config.quotas');
        }
        assert(flag);
        done();
    });

    it('throws error for invalid quotas bufferSize value', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { bufferSize: 'string value' }})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
            flag = err.message.includes('config.quotas.bufferSize is not an object');
        }
        assert(flag);
        done();
    });

    it('throws error for non-number bufferSize', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { bufferSize: { default: 'over9000' }}})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag =  err.message.includes('bufferSize.default is not a number');
        }
        assert(flag);
        done();
    });

    it('throws error for invalid quotas bufferSize', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { bufferSize: { default: -1 }}})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
            flag = err.message.includes('config.quotas.bufferSize.default must be greater than or equal to zero');
        }
        assert(flag);
        done();
    });

    it('throws error for invalid timeunit quotas bufferSize', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { bufferSize: { year: 1000 }}})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
            flag = err.message.includes('invalid value in config.quotas.bufferSize: year, valid values are hour, minute, day, week, month & default');
        }
        assert(flag);
        done();
    });

    it('accepts a zero quota bufferSize', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { bufferSize: { minute: 0 }}})
        defaultValidator.validate(quotas);
        done();
    });

    it('accepts a valid quota bufferSize', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { bufferSize: { minute: 1 }}})
        defaultValidator.validate(quotas);
        done();
    });

    it('throws error for non-boolean useRedis', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { useRedis: 'invalid' }})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag = err.message.includes('config.quotas.useRedis should be a boolean');
        }
        assert(flag);
        done();
    });

    it('throws error for null useRedis', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { useRedis: null }})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag = err.message.includes('config.quotas.useRedis should be a boolean');
        }
        assert(flag);
        done();
    });

    it('throws error for not string type excludeUrls', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: {excludeUrls: true}})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag = err.message.includes('config.quotas.excludeUrls is not an string');
        }
        assert(flag);
        done();
    });

    it('accepts a valid quota useRedis', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { useRedis: true }})
        defaultValidator.validate(quotas);
        done();
    });

    it('throws error for non-boolean useDebugMpId', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { useDebugMpId: 'invalid' }})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag = err.message.includes('config.quotas.useDebugMpId should be a boolean');
        }
        assert(flag);
        done();
    });

    it('throws error for null useDebugMpId', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { useDebugMpId: null }})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag = err.message.includes('config.quotas.useDebugMpId should be a boolean');
        }
        assert(flag);
        done();
    });

    it('accepts a valid quota useDebugMpId', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { useDebugMpId: true }})
        defaultValidator.validate(quotas);
        done();
    });

    it('throws error for non-boolean failOpen', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { failOpen: 'invalid' }})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag = err.message.includes('config.quotas.failOpen should be a boolean');
        }
        assert(flag);
        done();
    });

    it('throws error for null failOpen', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { failOpen: null }})
        let flag = false;
        try {
            defaultValidator.validate(quotas);
        } catch (err) {
           flag = err.message.includes('config.quotas.failOpen should be a boolean');
        }
        assert(flag);
        done();
    });

    it('accepts a valid quota failOpen', (done) => {
        const quotas = Object.assign({}, loadedConfig, { quotas: { failOpen: true }})
        defaultValidator.validate(quotas);
        done();
    });

    it('throws error for null to_console', (done) => {
        const invalidToConsole = _.cloneDeep(loadedConfig)
        invalidToConsole.edgemicro.logging.to_console = null
        try {
            defaultValidator.validate(invalidToConsole);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.logging.to_console should be a boolean'));
        }
        done();
    });

    it('throws error for invalid to_console', (done) => {
        const invalidToConsole = _.cloneDeep(loadedConfig)
        invalidToConsole.edgemicro.logging.to_console = true
        try {
            defaultValidator.validate(invalidToConsole);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.logging.to_console should be a boolean'));
        }
        done();
    });

    it('Accepts a valid to_console', (done) => {
        const toConsole = _.cloneDeep(loadedConfig)
        toConsole.edgemicro.logging.to_console = true
        defaultValidator.validate(toConsole);
        done();
    });

    it('throws error for null excludeUrls', (done) => {
        const invalidExcludeUrls = _.cloneDeep(loadedConfig)
        invalidExcludeUrls.edgemicro.plugins.excludeUrls = null
        try {
            defaultValidator.validate(invalidExcludeUrls);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.plugins.excludeUrls is not an string'));
        }
        done();
    });

    it('throws error for invalid excludeUrls', (done) => {
        const invalidExcludeUrls = _.cloneDeep(loadedConfig)
        invalidExcludeUrls.edgemicro.plugins.excludeUrls = true
        try {
            defaultValidator.validate(invalidExcludeUrls);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.plugins.excludeUrls is not an string'));
        }
        done();
    });

    it('Accepts a valid excludeUrls', (done) => {
        const excludeUrls = _.cloneDeep(loadedConfig)
        excludeUrls.edgemicro.plugins.excludeUrls = 'test_url'
        defaultValidator.validate(excludeUrls);
        done();
    });

    it('throws error for null disableExcUrlsCache', (done) => {
        const invalidDisableExcUrlsCache = _.cloneDeep(loadedConfig)
        invalidDisableExcUrlsCache.edgemicro.plugins.disableExcUrlsCache = null
        try {
            defaultValidator.validate(invalidDisableExcUrlsCache);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.plugins.disableExcUrlsCache should be a boolean'));
        }
        done();
    });

    it('throws error for non-boolean disableExcUrlsCache', (done) => {
        const invalidDisableExcUrlsCache = _.cloneDeep(loadedConfig)
        invalidDisableExcUrlsCache.edgemicro.plugins.disableExcUrlsCache = 'invalid'
        try {
            defaultValidator.validate(invalidDisableExcUrlsCache);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.plugins.disableExcUrlsCache should be a boolean'));
        }
        done();
    });

    it('Accepts a valid disableExcUrlsCache', (done) => {
        const disableExcUrlsCache = _.cloneDeep(loadedConfig)
        disableExcUrlsCache.edgemicro.plugins.disableExcUrlsCache = true
        defaultValidator.validate(disableExcUrlsCache);
        done();
    });

    it('throws error for null keep_alive_timeout', (done) => {
        const invalidKeepAliveTimeout = _.cloneDeep(loadedConfig)
        invalidKeepAliveTimeout.edgemicro.keep_alive_timeout = null
        try {
            defaultValidator.validate(invalidKeepAliveTimeout);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.keep_alive_timeout is not an number'));
        }
        done();
    });

    it('throws error for invalid keep_alive_timeout', (done) => {
        const invalidKeepAliveTimeout = _.cloneDeep(loadedConfig)
        invalidKeepAliveTimeout.edgemicro.keep_alive_timeout = 'over99'
        try {
            defaultValidator.validate(invalidKeepAliveTimeout);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.keep_alive_timeout is not an number'));
        }
        done();
    });

    it('throws error if keep_alive_timeout is not greater than zero', (done) => {
        const invalidKeepAliveTimeout = _.cloneDeep(loadedConfig)
        invalidKeepAliveTimeout.edgemicro.keep_alive_timeout = 0
        try {
            defaultValidator.validate(invalidKeepAliveTimeout);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.keep_alive_timeout should be greater than 0'));
        }
        done();
    });

    it('Accepts a valid keep_alive_timeout', (done) => {
        const keepAliveTimeout = _.cloneDeep(loadedConfig)
        keepAliveTimeout.edgemicro.keep_alive_timeout = 100
        defaultValidator.validate(keepAliveTimeout);
        done();
    });

    it('throws error for null headers_timeout', (done) => {
        const invalidHeadersTimeout = _.cloneDeep(loadedConfig)
        invalidHeadersTimeout.edgemicro.headers_timeout = null
        try {
            defaultValidator.validate(invalidHeadersTimeout);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.headers_timeout is not an number'));
        }
        done();
    });

    it('throws error for invalid headers_timeout', (done) => {
        const invalidHeadersTimeout = _.cloneDeep(loadedConfig)
        invalidHeadersTimeout.edgemicro.headers_timeout = 'over99'
        try {
            defaultValidator.validate(invalidHeadersTimeout);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.headers_timeout is not an number'));
        }
        done();
    });

    it('throws error if headers_timeout is not greater than zero', (done) => {
        const invalidHeadersTimeout = _.cloneDeep(loadedConfig)
        invalidHeadersTimeout.edgemicro.headers_timeout = 0
        try {
            defaultValidator.validate(invalidHeadersTimeout);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.headers_timeout should be greater than 0'));
        }
        done();
    });

    it('Accepts a valid headers_timeout', (done) => {
        const headersTimeout = _.cloneDeep(loadedConfig)
        headersTimeout.edgemicro.headers_timeout = 100
        defaultValidator.validate(headersTimeout);
        done();
    });

    it('throws error for null redisHost', (done) => {
        const invalidRedisHost = _.cloneDeep(loadedConfig)
        invalidRedisHost.edgemicro.redisHost = null
        try {
            defaultValidator.validate(invalidRedisHost);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisHost is not an string'));
        }
        done();
    });

    it('throws error for invalid redisHost', (done) => {
        const invalidRedisHost = _.cloneDeep(loadedConfig)
        invalidRedisHost.edgemicro.redisHost = true
        try {
            defaultValidator.validate(invalidRedisHost);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisHost is not an string'));
        }
        done();
    });

    it('Accepts a valid redisHost', (done) => {
        const redisHost = _.cloneDeep(loadedConfig)
        redisHost.edgemicro.redisHost = 'redis_host_url'
        defaultValidator.validate(redisHost);
        done();
    });

    it('throws error for null redisPort', (done) => {
        const invalidRedisPort = _.cloneDeep(loadedConfig)
        invalidRedisPort.edgemicro.redisPort = null
        try {
            defaultValidator.validate(invalidRedisPort);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisPort is not an number'));
        }
        done();
    });

    it('throws error for invalid redisPort', (done) => {
        const invalidRedisPort = _.cloneDeep(loadedConfig)
        invalidRedisPort.edgemicro.redisPort = true
        try {
            defaultValidator.validate(invalidRedisPort);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisPort is not an number'));
        }
        done();
    });

    it('Accepts a valid redisPort', (done) => {
        const redisPort = _.cloneDeep(loadedConfig)
        redisPort.edgemicro.redisPort = 1111
        defaultValidator.validate(redisPort);
        done();
    });

    it('throws error for null redisDb', (done) => {
        const invalidRedisDb = _.cloneDeep(loadedConfig)
        invalidRedisDb.edgemicro.redisDb = null
        try {
            defaultValidator.validate(invalidRedisDb);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisDb is not an number'));
        }
        done();
    });

    it('throws error for invalid redisDb', (done) => {
        const invalidRedisDb = _.cloneDeep(loadedConfig)
        invalidRedisDb.edgemicro.redisDb = 'over99'
        try {
            defaultValidator.validate(invalidRedisDb);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisDb is not an number'));
        }
        done();
    });

    it('throws error if redisDb is less than zero', (done) => {
        const invalidRedisDb = _.cloneDeep(loadedConfig)
        invalidRedisDb.edgemicro.redisDb = -20
        try {
            defaultValidator.validate(invalidRedisDb);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisDb must be >= 0'));
        }
        done();
    });

    it('Accepts a valid redisDb', (done) => {
        const redisDb = _.cloneDeep(loadedConfig)
        redisDb.edgemicro.redisDb = 100
        defaultValidator.validate(redisDb);
        done();
    });

    it('throws error for null redisPassword', (done) => {
        const invalidRedisPassword = _.cloneDeep(loadedConfig)
        invalidRedisPassword.edgemicro.redisPassword = null
        try {
            defaultValidator.validate(invalidRedisPassword);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisPassword is not an string'));
        }
        done();
    });

    it('throws error for invalid redisPassword', (done) => {
        const invalidRedisPassword = _.cloneDeep(loadedConfig)
        invalidRedisPassword.edgemicro.redisPassword = 100
        try {
            defaultValidator.validate(invalidRedisPassword);
        } catch (err) {
            assert(err.message.includes('config.edgemicro.redisPassword is not an string'));
        }
        done();
    });

    it('Accepts a valid redisPassword', (done) => {
        const redisPassword = _.cloneDeep(loadedConfig)
        redisPassword.edgemicro.redisPassword = 'valid_pass'
        defaultValidator.validate(redisPassword);
        done();
    });

    it('throws error for null redisBasedConfigCache', (done) => {
        const invalidRedisBasedConfigCache = _.cloneDeep(loadedConfig)
        invalidRedisBasedConfigCache.edge_config.redisBasedConfigCache = null
        try {
            defaultValidator.validate(invalidRedisBasedConfigCache);
        } catch (err) {
            assert(err.message.includes('config.edge_config.redisBasedConfigCache should be a boolean'));
        }
        done();
    });

    it('throws error for non-boolean redisBasedConfigCache', (done) => {
        const invalidRedisBasedConfigCache = _.cloneDeep(loadedConfig)
        invalidRedisBasedConfigCache.edge_config.redisBasedConfigCache = 100
        try {
            defaultValidator.validate(invalidRedisBasedConfigCache);
        } catch (err) {
            assert(err.message.includes('config.edge_config.redisBasedConfigCache should be a boolean'));
        }
        done();
    });

    it('Accepts a valid redisBasedConfigCache', (done) => {
        const redisBasedConfigCache = _.cloneDeep(loadedConfig)
        redisBasedConfigCache.edge_config.redisBasedConfigCache = true
        defaultValidator.validate(redisBasedConfigCache);
        done();
    });

    it('throws error for null synchronizerMode', (done) => {
        const invalidSynchronizerMode = _.cloneDeep(loadedConfig)
        invalidSynchronizerMode.edge_config.synchronizerMode = null
        try {
            defaultValidator.validate(invalidSynchronizerMode);
        } catch (err) {
            assert(err.message.includes('config.edge_config.synchronizerMode is not a number'));
        }
        done();
    });

    it('throws error for invalid synchronizerMode', (done) => {
        const invalidSynchronizerMode = _.cloneDeep(loadedConfig)
        invalidSynchronizerMode.edge_config.synchronizerMode = 'invalid'
        try {
            defaultValidator.validate(invalidSynchronizerMode);
        } catch (err) {
            assert(err.message.includes('config.edge_config.synchronizerMode is not a number'));
        }
        done();
    });

    it('throws error for invalid integer value of synchronizerMode', (done) => {
        const invalidSynchronizerMode = _.cloneDeep(loadedConfig)
        invalidSynchronizerMode.edge_config.synchronizerMode = 5
        try {
            defaultValidator.validate(invalidSynchronizerMode);
        } catch (err) {
            assert(err.message.includes('config.edge_config.synchronizerMode should be either 0 | 1 | 2'));
        }
        done();
    });

    it('Accepts a valid synchronizerMode', (done) => {
        const synchronizerMode = _.cloneDeep(loadedConfig)
        synchronizerMode.edge_config.synchronizerMode = 1
        defaultValidator.validate(synchronizerMode);
        done();
    });

    //prapunj-test-cases

    it('throws error for non boolean enableanalytics', (done) => {
        const enableAnalytics = _.cloneDeep(loadedConfig)
        enableAnalytics.edgemicro.enableAnalytics = 'string' 
        try{   
        defaultValidator.validate(enableAnalytics)
    }catch(err){
        assert(err.message.includes("config.edgemicro.enableAnalytics should be a boolean"))
    }
        done();
    });

    it('throws error for invalid logTargetErrorsAs', (done) => {
        const logTargetErrorsAs = _.cloneDeep(loadedConfig)
        logTargetErrorsAs.edgemicro.logTargetErrorsAs = 'overx' 
        try{   
        defaultValidator.validate(logTargetErrorsAs)
    }catch(err){
        assert(err.message.includes("invalid value for config.edgemicro.logTargetErrorsAs"))
    }
        done();
    });

    it('throws error for non string noRuleMatchAction', (done) => {
        const accesscontrolconf = _.cloneDeep(loadedConfig)
        accesscontrolconf.accesscontrol={noRuleMatchAction :true} 
        try{   
        defaultValidator.validate(accesscontrolconf)
    }catch(err){
        assert(err.message.includes("config.accesscontrol.noRuleMatchAction is not an string"))
    }
        done();
    });

    it('throws error for invalid noRuleMatchAction', (done) => {
        const accesscontrolconf = _.cloneDeep(loadedConfig)
        accesscontrolconf.accesscontrol={noRuleMatchAction :'invalid'} 
        try{   
        defaultValidator.validate(accesscontrolconf)
    }catch(err){
        assert(err.message.includes("config.accesscontrol.noRuleMatchAction is invalid"))
    }
        done();
    });

    it('throws error for non boolean enable_GET_req_body', (done) => {
        const enable = _.cloneDeep(loadedConfig)
        enable.edgemicro.enable_GET_req_body = "overx" 
        //console.log(enable_GET_req_body)
        try{   
        defaultValidator.validate(enable)
    }catch(err){
        assert(err.message.includes("config.edgemicro.enable_GET_req_body should be a boolean"))
    }
        done();
    });

    it('throws error for non number enableanalytics buffersize', (done) => {
        const enableAnalyticsbuff = _.cloneDeep(loadedConfig)
        enableAnalyticsbuff.edgemicro.enableAnalytics = true
        enableAnalyticsbuff.analytics = {bufferSize :'string'} 
        try{   
        defaultValidator.validate(enableAnalyticsbuff)
    }catch(err){
        assert(err.message.includes("config.analytics.bufferSize is not a number"))
    }
        done();
    });

    it('throws error for non positive enableanalytics buffersize', (done) => {
        const enableAnalyticsbuff = _.cloneDeep(loadedConfig)
        enableAnalyticsbuff.edgemicro.enableAnalytics = true
        enableAnalyticsbuff.analytics = {bufferSize :-1} 
        try{   
        defaultValidator.validate(enableAnalyticsbuff)
    }catch(err){
        assert(err.message.includes("config.analytics.bufferSize is invalid"))
    }
        done();
    });

    it('throws error for undefined proxy', (done) => {
        const tenabled = _.cloneDeep(loadedConfig)
        tenabled.edgemicro.proxy = {enabled: undefined} 
        try{   
        defaultValidator.validate(tenabled)
    }catch(err){
        console.log(err)
        assert(err.message.includes("proxy must be defined using edgemicro.proxy.url or environment variable"))
    }
        done();
    });

    it('throws error for non boolean proxy enabled', (done) => {
        const tenabled = _.cloneDeep(loadedConfig)
        tenabled.edgemicro.proxy = {enabled: "over"} 
        try{   
        defaultValidator.validate(tenabled)
    }catch(err){
        assert(err.message.includes("config.edgemicro.proxy.enabled should be a boolean"))
    }
        done();
    });

    it('throws error for no proxy url', (done) => {
        var tunnelt = _.cloneDeep(loadedConfig)
        tunnelt.edgemicro.proxy = {enabled: true, tunnel: "over"} 
        try{   
        defaultValidator.validate(tunnelt)
    }catch(err){
        //console.log(err)
        assert(err.message.includes("proxy must be defined using edgemicro.proxy.url or environment variable HTTP_PROXY/http_proxy"))
    }
        done();
    });

    it('throws error for non boolean tunnel', (done) => {
        var tenabled = _.cloneDeep(loadedConfig)
        tenabled.edgemicro.proxy = {enabled: true, url: "localhost:8080/hello", tunnel: "overx"} 
        try{   
        defaultValidator.validate(tenabled)
    }catch(err){
        console.log(err)
        assert(err.message.includes("config.edgemicro.proxy.tunnel should be a boolean"))
    }
        done();
    });

    it('throws error for false value of enabled when tunnel is defined', (done) => {
        var tenabled = _.cloneDeep(loadedConfig) 
        tenabled.edgemicro.proxy = {enabled: false, url: "localhost:8080/hello", tunnel: "overx"} 
        try{   
        defaultValidator.validate(tenabled)
    }catch(err){
        console.log(err)
        assert(err.message.includes("edgemicro.proxy.enabled must be true, if config.edgemicro.proxy.tunnel is defined"))
    }
        done();
    });

});
