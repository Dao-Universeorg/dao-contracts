const namehash = require('eth-ens-namehash');
const sha3 = require('web3-utils').sha3;

const DNS = artifacts.require('DNSRegistryWithFallback.sol');

const DNSWithoutFallback = artifacts.require("./registry/DNSRegistry.sol");

contract('DNSRegistryWithFallback', function (accounts) {

    let old;
    let dns;

    beforeEach(async () => {
        old = await DNSWithoutFallback.new();
        dns = await DNS.new(old.address);
    });

    it('should allow setting the record', async () => {
        let result = await dns.setRecord('0x0', accounts[1], accounts[2], 3600, {from: accounts[0]});
        assert.equal(result.logs.length, 3);

        assert.equal((await dns.owner('0x0')), accounts[1]);
        assert.equal((await dns.resolver('0x0')), accounts[2]);
        assert.equal((await dns.ttl('0x0')).toNumber(), 3600);
    });

    it('should allow setting subnode records', async () => {
        let result = await dns.setSubnodeRecord('0x0', sha3('test'), accounts[1], accounts[2], 3600, {from: accounts[0]});

        let hash = namehash.hash("test");
        assert.equal(await dns.owner(hash), accounts[1]);
        assert.equal(await dns.resolver(hash), accounts[2]);
        assert.equal((await dns.ttl(hash)).toNumber(), 3600);
    });

    it('should implement authorisations/operators', async () => {
        await dns.setApprovalForAll(accounts[1], true, {from: accounts[0]});
        await dns.setOwner("0x0", accounts[2], {from: accounts[1]});
        assert.equal(await dns.owner("0x0"), accounts[2]);
    });

    describe('fallback', async () => {

        let hash = namehash.hash('dao');

        beforeEach(async () => {
            await old.setSubnodeOwner('0x0', sha3('dao'), accounts[0], {from: accounts[0]});
        });

        it('should use fallback ttl if owner not set', async () => {
            let hash = namehash.hash('dao')
            await old.setSubnodeOwner('0x0', sha3('dao'), accounts[0], {from: accounts[0]});
            await old.setTTL(hash, 3600, {from: accounts[0]});
            assert.equal((await dns.ttl(hash)).toNumber(), 3600);
        });

        it('should use fallback owner if owner not set', async () => {
            await old.setOwner(hash, accounts[0], {from: accounts[0]});
            assert.equal(await dns.owner(hash), accounts[0]);
        });

        it('should use fallback resolver if owner not set', async () => {
            await old.setResolver(hash, accounts[0], {from: accounts[0]});
            assert.equal(await dns.resolver(hash), accounts[0]);
        });
    });
});
