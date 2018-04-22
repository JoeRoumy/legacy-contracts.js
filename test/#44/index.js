'use strict'

const assert = require('assert')
const Promise = require('bluebird')
const test = require('../../lib/test')

const vector = test.Vector()

describe('#44', function () {
  before(vector.before(__dirname, {protocol: 'http:'}))
  after(vector.after())

  this.timeout(60 * 1000)

  it('#44', vector.it(function (manager) {
    const source = `
      contract SimpleStorage {
          address storedData;

          function set(address x) {
              storedData = x;
          }

          function get() constant returns (address retVal) {
              return storedData;
          }
      }
    `

    return test.compile(manager, source, 'SimpleStorage').then((contract) =>
      Promise.fromCallback((callback) =>
        contract.set('88977A37D05A4FE86D09E88C88A49C2FCF7D6D8F', callback)
      ).then(() =>
        Promise.fromCallback((callback) =>
          contract.get(callback)
        )
      )
    ).then((value) => {
      assert.equal(value, '88977A37D05A4FE86D09E88C88A49C2FCF7D6D8F')
    })
  }))
})
