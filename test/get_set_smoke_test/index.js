const path = require('path')
const assert = require('assert')
const fs = require('fs-extra')

const test = require('../../lib/test')

const vector = test.Vector()

const sourcePath = './GetSet.sol'

const source = fs.readFileSync(path.join(__dirname, sourcePath)).toString()

const testUint = 42
const testBytes = 'DEADBEEF00000000000000000000000000000000000000000000000000000000'
const testString = 'Hello World!'
const testBool = true

let TestContract

// Create a factory for the contract with the JSON interface 'myAbi'.
// const ContractFactory = contractManager.newContractFactory(ABI)

describe('Setting and Getting Values:', function () {
  before(vector.before(__dirname, {protocol: 'http:'}, (manager) => {
    return test.compile(manager, source, 'GetSet').then((contract) => {
      TestContract = contract
    })
  }))
  after(vector.after())

  it('Uint', vector.it(function (manager) {
    return new Promise((resolve, reject) => {
      TestContract.setUint(testUint, function (err) {
        if (err) { reject(err) }

        TestContract.getUint(function (err, output) {
          if (err) { reject(err) }

          assert.equal(output, testUint)
          resolve()
        })
      })
    })
  }))

  it('Bool', vector.it(function (manager) {
    return new Promise((resolve, reject) => {
      TestContract.setBool(testBool, function (err) {
        if (err) { reject(err) }

        TestContract.getBool(function (err, output) {
          if (err) { reject(err) }

          assert.equal(output, testBool)
          resolve()
        })
      })
    })
  }))

  it('Bytes', vector.it(function (manager) {
    return new Promise((resolve, reject) => {
      TestContract.setBytes(testBytes, function (err) {
        if (err) { reject(err) }

        TestContract.getBytes(function (err, output) {
          if (err) { reject(err) }

          assert.equal(output, testBytes)
          resolve()
        })
      })
    })
  }))

  it('String', vector.it(function (manager) {
    return new Promise((resolve, reject) => {
      TestContract.setString(testString, function (err) {
        if (err) { reject(err) }

        TestContract.getString(function (err, output) {
          if (err) { reject(err) }

          assert.equal(output, testString)
          resolve()
        })
      })
    })
  }))
})
