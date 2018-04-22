'use strict'

const assert = require('assert')
const Promise = require('bluebird')
const test = require('../../lib/test')

const vector = test.Vector()

describe('#46', function () {
  before(vector.before(__dirname, {protocol: 'http:'}))
  after(vector.after())

  this.timeout(10 * 1000)

  it('#46', vector.it(function (manager) {
    const source = `
      contract Test{

        string _name;

        function setName(string newname) {
          _name = newname;
        }

        function getNameConstant() constant returns (string) {
          return _name;
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
        Promise.all([
          Promise.fromCallback((callback) =>
            contract.getNameConstant(callback)
          ),
          Promise.fromCallback((callback) =>
            contract.getName(callback)
          )
        ])
      )
    ).then(([constant, nonConstant]) => {
      assert.equal(constant, nonConstant)
    })
  }))
})
