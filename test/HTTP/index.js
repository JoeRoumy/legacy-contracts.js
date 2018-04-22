'use strict'

const assert = require('assert')
const Promise = require('bluebird')
const test = require('../../lib/test')

const vector = test.Vector()

describe('HTTP', function () {
  before(vector.before(__dirname, {protocol: 'http:'}))
  after(vector.after())

  this.timeout(10 * 1000)

  it('sets and gets a value from a contract', vector.it(function (manager) {
    const source = `
      contract SimpleStorage {
          uint storedData;

          function set(uint x) {
              storedData = x;
          }

          function get() constant returns (uint retVal) {
              return storedData;
          }
      }
    `

    return test.compile(manager, source, 'SimpleStorage').then((contract) =>
      Promise.fromCallback((callback) =>
        contract.set(42, callback)
      ).then(() =>
        Promise.fromCallback((callback) =>
          contract.get(callback)
        )
      )
    ).then((value) => {
      assert.equal(value, 42)
    })
  }))
})
