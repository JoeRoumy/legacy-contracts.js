'use strict'

const assert = require('assert')
const Promise = require('bluebird')
const test = require('../../lib/test')

const vector = test.Vector()

describe('#45', function () {
  before(vector.before(__dirname, {protocol: 'http:'}))
  after(vector.after())

  this.timeout(10 * 1000)

  it('nottherealbatman', vector.it(function (manager) {
    const source = `
      contract Test {

          string _name;

          function add(int a, int b) constant returns (int sum) {
              sum = a + b;
          }

          function setName(string newname) {
             _name = newname;
          }

          function getName() returns (string) {
              return _name;
          }
      }
    `

    return test.compile(manager, source, 'Test').then((contract) =>
      Promise.fromCallback((callback) =>
        contract.setName('Batman', callback)
      ).then(() =>
        Promise.fromCallback((callback) =>
          contract.getName(callback)
        )
      )
    ).then((value) => {
      assert.equal(value, 'Batman')
    })
  }))

  it('rguikers', vector.it(function (manager) {
    const source = `
      contract Test {

          function getAddress() returns (address) {
            return this;
          }

          function getNumber() returns (uint) {
            return 100;
          }

      }
    `

    return test.compile(manager, source, 'Test').then((contract) =>
      Promise.all([
        Promise.fromCallback((callback) =>
          contract.getAddress(callback)
        ),
        Promise.fromCallback((callback) =>
          contract.getNumber(callback)
        )
      ]).then(([address, number]) => {
        assert.equal(address.length, 40)
        assert.equal(number, 100)
      })
    )
  }))
})
