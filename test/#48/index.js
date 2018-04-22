'use strict'

const assert = require('assert')
const Promise = require('bluebird')
const test = require('../../lib/test')

const vector = test.Vector()

describe('#48', function () {
  before(vector.before(__dirname, {protocol: 'http:'}))
  after(vector.after())

  this.timeout(10 * 1000)

  it('#48', vector.it(function (manager) {
    const source = `
      contract Test {

          function getAddress() returns (address) {
            return this;
          }

          function getNumber() returns (uint) {
            return 100;
          }

          function getCombination() returns (uint _number, address _address) {
            _number = 100;
            _address = this;
          }

      }
    `

    return test.compile(manager, source, 'Test').then((contract) =>
      Promise.fromCallback((callback) =>
        contract.getCombination(callback)
      )
    ).then(([number, address]) => {
      assert.equal(number, 100)
      assert.equal(address.length, 40)
    })
  }))
})
