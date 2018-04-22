'use strict'

const assert = require('assert')
const Promise = require('bluebird')
const test = require('../../lib/test')

const vector = test.Vector()

describe('issue #21', function () {
  this.timeout(10 * 1000)
  let contract

  before(vector.before(__dirname, {protocol: 'http:'}, function (manager) {
    const source = `
      contract c {
        function getBytes() constant returns (byte[10]){
            byte[10] memory b;
            string memory s = "hello";
            bytes memory sb = bytes(s);

            uint k = 0;
            for (uint i = 0; i < sb.length; i++) b[k++] = sb[i];
            b[9] = 0xff;
            return b;
        }

        function deeper() constant returns (byte[12][100] s, uint count) {
          count = 42;
          return (s, count);
        }
      }
    `

    return test.compile(manager, source, 'c').then((compiledContract) => {
      contract = compiledContract
    })
  }))

  after(vector.after())

  it('gets the static byte array decoded properly', vector.it(function () {
    return Promise.fromCallback((callback) => contract.getBytes(callback))
      .then((bytes) => {
        assert.deepEqual(
          bytes,
          ['68', '65', '6C', '6C', '6F', '00', '00', '00', '00', 'FF']
        )
      })
  }))

  it('returns multiple values correctly from a function',
    vector.it(function () {
      return Promise.fromCallback((callback) => contract.deeper(callback))
        .then((values) => {
          assert.equal(Number(values[1]), 42)
        })
    })
  )
})
